const CONFIG = {
  googleScriptUrl: "",
  courseName: "역학 및 건강증진",
  presentationDate: "2026-06-09"
};

const GROUPS = [
  {
    id: "1",
    label: "1조",
    members: ["김소연", "정윤철", "김민경", "이다영"]
  },
  {
    id: "2",
    label: "2조",
    members: ["김진현", "최민기", "김민서(09)", "박지후"]
  },
  {
    id: "3",
    label: "3조",
    members: ["황수연", "소하연", "남승현", "김민서(06)"]
  }
];

const PEER_ITEMS = [
  {
    id: "attendanceParticipation",
    title: "출석 및 참여도",
    detail: "조 모임 및 발표 준비에 성실히 참여하였는가"
  },
  {
    id: "roleResponsibility",
    title: "맡은 역할 수행",
    detail: "맡은 업무를 책임감 있게 수행하였는가"
  },
  {
    id: "researchContribution",
    title: "자료조사 기여",
    detail: "근거자료, 통계, 정책자료 등을 적극적으로 수집하였는가"
  },
  {
    id: "communicationCollaboration",
    title: "협력 및 의사소통",
    detail: "조원들과 원활하게 소통하고 협력하였는가"
  },
  {
    id: "presentationContribution",
    title: "발표 기여도",
    detail: "발표자료 제작 또는 발표에 실질적으로 기여하였는가"
  }
];

const GROUP_ITEMS = [
  {
    id: "topicFit",
    title: "주제 적절성",
    detail: "건강문제가 대학생 또는 지역사회 건강증진 관점에서 적절하게 선정되었는가"
  },
  {
    id: "problemAnalysis",
    title: "문제 분석",
    detail: "건강문제의 규모, 영향, 결정요인을 논리적으로 설명하였는가"
  },
  {
    id: "evidenceUse",
    title: "근거 활용",
    detail: "통계, 연구결과, 정책자료 등 객관적 근거를 적절히 활용하였는가"
  },
  {
    id: "precedeDiagnosis",
    title: "PRECEDE 진단",
    detail: "PRECEDE 모형을 올바르게 적용하였는가"
  },
  {
    id: "promotionStrategy",
    title: "건강증진 전략",
    detail: "제안한 전략이 현실적이고 타당한가"
  },
  {
    id: "presentationDelivery",
    title: "발표 전달력",
    detail: "발표가 이해하기 쉽고 체계적이었는가"
  }
];

const DRAFT_KEY = "health-promotion-survey-draft-v1";

const refs = {
  form: document.querySelector("#evaluationForm"),
  evaluatorMember: document.querySelector("#evaluatorMember"),
  studentId: document.querySelector("#studentId"),
  ownGroup: document.querySelector("#ownGroup"),
  endpointUrl: document.querySelector("#endpointUrl"),
  peerCards: document.querySelector("#peerCards"),
  groupCards: document.querySelector("#groupCards"),
  peerProgress: document.querySelector("#peerProgress"),
  groupProgress: document.querySelector("#groupProgress"),
  connectionState: document.querySelector("#connectionState"),
  formStatus: document.querySelector("#formStatus"),
  toast: document.querySelector("#toast"),
  payloadDialog: document.querySelector("#payloadDialog"),
  payloadPreview: document.querySelector("#payloadPreview"),
  saveDraftButton: document.querySelector("#saveDraftButton"),
  previewButton: document.querySelector("#previewButton"),
  downloadButton: document.querySelector("#downloadButton"),
  submitButton: document.querySelector("#submitButton"),
  systemButtons: document.querySelectorAll("[data-system]"),
  systemPanels: document.querySelectorAll("[data-system-panel]")
};

let toastTimer = 0;
let autosaveTimer = 0;
let activeSystem = "peer";

init();

function init() {
  renderGroupOptions();
  const draftFields = readDraftFields();
  hydrateFields(draftFields);
  renderMemberOptions();
  hydrateFields(draftFields);
  renderEvaluationCards();
  hydrateFields(draftFields);
  updateConnectionState();
  setActiveSystem(draftFields.activeSystem || activeSystem);
  updateProgress();

  refs.ownGroup.addEventListener("change", () => {
    renderMemberOptions();
    renderEvaluationCards();
    updateProgress();
    queueDraftSave();
  });

  refs.evaluatorMember.addEventListener("change", () => {
    renderEvaluationCards();
    updateProgress();
    queueDraftSave();
  });

  if (refs.endpointUrl) {
    refs.endpointUrl.addEventListener("input", () => {
      updateConnectionState();
      queueDraftSave();
    });
  }

  refs.form.addEventListener("change", event => {
    if (event.target.matches("input, select, textarea")) {
      updateProgress();
      queueDraftSave();
    }
  });

  refs.form.addEventListener("input", event => {
    if (event.target.matches("textarea, input")) {
      queueDraftSave();
    }
  });

  refs.form.addEventListener("submit", handleSubmit);
  refs.saveDraftButton.addEventListener("click", saveDraft);
  refs.previewButton.addEventListener("click", previewPayload);
  if (refs.downloadButton) {
    refs.downloadButton.addEventListener("click", downloadCurrentPayload);
  }

  refs.systemButtons.forEach(button => {
    button.addEventListener("click", event => {
      const system = event.currentTarget.dataset.system;
      if (system) {
        setActiveSystem(system);
        queueDraftSave();
      }
    });
  });
}

function renderGroupOptions() {
  const options = GROUPS.map(group => `<option value="${group.id}">${group.label}</option>`).join("");
  refs.ownGroup.insertAdjacentHTML("beforeend", options);
}

function renderMemberOptions() {
  const group = getSelectedGroup();
  const previousValue = refs.evaluatorMember.value;

  if (!group) {
    refs.evaluatorMember.disabled = true;
    refs.evaluatorMember.innerHTML = '<option value="">본인 조를 먼저 선택하세요</option>';
    return;
  }

  const options = group.members
    .map(member => `<option value="${escapeHtml(member)}">${escapeHtml(member)}</option>`)
    .join("");

  refs.evaluatorMember.disabled = false;
  refs.evaluatorMember.innerHTML = `<option value="">본인 이름 선택</option>${options}`;

  if (group.members.includes(previousValue)) {
    refs.evaluatorMember.value = previousValue;
  }
}

function renderEvaluationCards() {
  const snapshot = serializeFields();
  const ownGroup = getSelectedGroup();
  const evaluatorName = normalizeName(refs.evaluatorMember.value);

  if (!ownGroup) {
    refs.peerCards.innerHTML = emptyState("본인 조를 선택하면 조원평가 항목이 표시됩니다.");
    refs.groupCards.innerHTML = emptyState("본인 조를 선택하면 다른 조 평가 항목이 표시됩니다.");
    return;
  }

  if (!evaluatorName) {
    refs.peerCards.innerHTML = emptyState("조원명을 선택하면 본인을 제외한 조원평가 항목이 표시됩니다.");
  } else {
  const peerTargets = ownGroup.members.filter(member => normalizeName(member) !== evaluatorName);
  refs.peerCards.innerHTML = peerTargets.length
    ? peerTargets.map((member, index) => renderCard({
        scope: "peer",
        targetId: `${ownGroup.id}-${index}`,
        title: member,
        subtitle: `${ownGroup.label} 조원`,
        items: PEER_ITEMS,
        maxScore: 25
      })).join("")
    : emptyState("평가자명과 일치하지 않는 조원이 없습니다.");
  }

  const targetGroups = GROUPS.filter(group => group.id !== ownGroup.id);
  refs.groupCards.innerHTML = targetGroups.map(group => renderCard({
    scope: "group",
    targetId: group.id,
    title: group.label,
    subtitle: group.members.join(", "),
    items: GROUP_ITEMS,
    maxScore: 30
  })).join("");

  hydrateFields(snapshot);
}

function setActiveSystem(system) {
  activeSystem = system === "group" ? "group" : "peer";

  refs.systemButtons.forEach(button => {
    button.classList.toggle("is-active", button.dataset.system === activeSystem);
  });

  refs.systemPanels.forEach(panel => {
    const isActive = panel.dataset.systemPanel === activeSystem;
    panel.hidden = !isActive;
    panel.classList.toggle("is-active", isActive);
  });

  const label = activeSystem === "peer" ? "조원평가" : "조별평가";
  refs.formStatus.textContent = `${label} 시스템이 선택되었습니다.`;
  refs.submitButton.textContent = `${label} 제출`;
}

function renderCard({ scope, targetId, title, subtitle, items, maxScore }) {
  const rows = items.map(item => renderRatingRow(scope, targetId, item)).join("");
  const commentName = `${scope}.${targetId}.comment`;

  return `
    <article class="eval-card" data-scope="${scope}" data-target-id="${targetId}" data-max-score="${maxScore}">
      <div class="eval-card-header">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p class="card-subtitle">${escapeHtml(subtitle)}</p>
        </div>
        <span class="total-pill" data-total>0/${maxScore}</span>
      </div>
      <div class="rating-table">
        ${rows}
      </div>
      <label class="comment-field">
        <span>의견</span>
        <textarea name="${commentName}" placeholder="선택 입력"></textarea>
      </label>
    </article>
  `;
}

function renderRatingRow(scope, targetId, item) {
  const name = `${scope}.${targetId}.${item.id}`;
  const options = [1, 2, 3, 4, 5].map(value => {
    const id = `${name}.${value}`.replace(/[^a-zA-Z0-9_.-]/g, "-");
    return `
      <input id="${id}" type="radio" name="${name}" value="${value}" />
      <label for="${id}">${value}</label>
    `;
  }).join("");

  return `
    <fieldset class="rating-row" data-rating-name="${name}" data-item-id="${item.id}">
      <div class="rating-copy">
        <legend class="rating-title">${escapeHtml(item.title)}</legend>
        <span class="rating-detail">${escapeHtml(item.detail)}</span>
      </div>
      <div class="rating-control" aria-label="${escapeHtml(item.title)} 점수">
        ${options}
      </div>
    </fieldset>
  `;
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function getSelectedGroup() {
  return GROUPS.find(group => group.id === refs.ownGroup.value) || null;
}

function normalizeName(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function updateConnectionState() {
  const endpoint = getEndpoint();
  refs.connectionState.textContent = endpoint ? "Google Sheets 전송" : "로컬 저장 모드";
}

function getEndpoint() {
  return (refs.endpointUrl?.value.trim() || CONFIG.googleScriptUrl.trim());
}

function updateProgress() {
  document.querySelectorAll(".eval-card").forEach(card => {
    const rows = [...card.querySelectorAll(".rating-row")];
    const selected = rows.filter(row => getSelectedRating(row) !== null);
    const sum = rows.reduce((total, row) => total + (getSelectedRating(row) || 0), 0);
    const maxScore = Number(card.dataset.maxScore);
    const totalNode = card.querySelector("[data-total]");

    totalNode.textContent = `${sum}/${maxScore}`;
    card.classList.toggle("is-complete", rows.length > 0 && selected.length === rows.length);
  });

  refs.peerProgress.textContent = progressText("peer");
  refs.groupProgress.textContent = progressText("group");
}

function progressText(scope) {
  const cards = [...document.querySelectorAll(`.eval-card[data-scope="${scope}"]`)];
  const complete = cards.filter(card => card.classList.contains("is-complete")).length;
  return `${complete}/${cards.length}`;
}

function getSelectedRating(row) {
  const selected = row.querySelector("input[type='radio']:checked");
  return selected ? Number(selected.value) : null;
}

function collectPayload({ validate = true, system = activeSystem } = {}) {
  clearErrors();

  const errors = [];
  const ownGroup = getSelectedGroup();
  const evaluatorName = refs.evaluatorMember.value.trim();
  const studentId = refs.studentId.value.trim();

  if (!evaluatorName) {
    errors.push("조원명을 선택하세요.");
    if (validate) {
      refs.evaluatorMember.classList.add("has-error");
    }
  }

  if (!ownGroup) {
    errors.push("본인 조를 선택하세요.");
    if (validate) {
      refs.ownGroup.classList.add("has-error");
    }
  }

  const systemType = system === "group" ? "group" : "peer";
  const peerEvaluations = systemType === "peer" ? collectCards("peer", PEER_ITEMS, errors, validate) : [];
  const groupEvaluations = systemType === "group" ? collectCards("group", GROUP_ITEMS, errors, validate) : [];

  const payload = {
    meta: {
      courseName: CONFIG.courseName,
      presentationDate: CONFIG.presentationDate,
      systemType,
      systemName: systemType === "peer" ? "조원평가" : "조별평가",
      submittedAt: new Date().toISOString(),
      source: "github-pages-survey"
    },
    evaluator: {
      name: evaluatorName,
      studentId,
      ownGroup: ownGroup ? ownGroup.label : "",
      ownGroupId: ownGroup ? ownGroup.id : ""
    },
    peerEvaluations,
    groupEvaluations
  };

  if (validate && errors.length) {
    const firstError = document.querySelector(".has-error") || refs.evaluatorMember;
    firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    refs.formStatus.textContent = errors[0];
    showToast(errors[0]);
    throw new Error(errors.join("\n"));
  }

  return payload;
}

function collectCards(scope, items, errors, validate) {
  return [...document.querySelectorAll(`.eval-card[data-scope="${scope}"]`)].map(card => {
    const scores = {};
    let total = 0;

    items.forEach(item => {
      const row = card.querySelector(`[data-item-id="${item.id}"]`);
      const score = row ? getSelectedRating(row) : null;

      if (score === null) {
        errors.push(`${card.querySelector("h3").textContent}의 ${item.title} 점수를 선택하세요.`);
        if (row && validate) {
          row.classList.add("has-error");
        }
      } else {
        total += score;
      }

      scores[item.id] = score;
    });

    const comment = card.querySelector("textarea")?.value.trim() || "";

    if (scope === "peer") {
      const targetName = card.querySelector("h3").textContent;
      return {
        targetType: "member",
        targetName,
        targetGroupId: refs.ownGroup.value,
        targetGroup: getSelectedGroup()?.label || "",
        scores,
        total,
        maxScore: 25,
        comment
      };
    }

    const group = GROUPS.find(item => item.id === card.dataset.targetId);
    return {
      targetType: "group",
      targetGroupId: group?.id || card.dataset.targetId,
      targetGroup: group?.label || card.querySelector("h3").textContent,
      targetMembers: group?.members || [],
      scores,
      total,
      maxScore: 30,
      comment
    };
  });
}

async function handleSubmit(event) {
  event.preventDefault();

  let payload;
  try {
    payload = collectPayload({ validate: true });
  } catch {
    return;
  }

  const endpoint = getEndpoint();

  if (!endpoint) {
    downloadJson(payload);
    refs.formStatus.textContent = "연결 설정이 없어 JSON 파일로 저장했습니다.";
    showToast("JSON 파일로 저장했습니다.");
    return;
  }

  try {
    refs.formStatus.textContent = "전송 중입니다.";
    await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });
    localStorage.removeItem(DRAFT_KEY);
    refs.formStatus.textContent = "전송 요청이 완료되었습니다.";
    showToast("전송 요청 완료");
  } catch (error) {
    refs.formStatus.textContent = "전송에 실패했습니다. JSON 저장을 사용하세요.";
    showToast("전송 실패");
  }
}

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({
    savedAt: new Date().toISOString(),
    fields: {
      ...serializeFields(),
      activeSystem
    }
  }));
  showToast("임시저장 완료");
}

function queueDraftSave() {
  window.clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(saveDraft, 700);
}

function readDraftFields() {
  const rawDraft = localStorage.getItem(DRAFT_KEY);
  if (!rawDraft) return {};

  try {
    const draft = JSON.parse(rawDraft);
    return draft.fields || {};
  } catch {
    localStorage.removeItem(DRAFT_KEY);
    return {};
  }
}

function serializeFields() {
  const data = {};
  const formData = new FormData(refs.form);
  formData.forEach((value, key) => {
    data[key] = value;
  });
  return data;
}

function hydrateFields(fields) {
  Object.entries(fields || {}).forEach(([name, value]) => {
    const controls = [...refs.form.querySelectorAll(`[name="${cssEscape(name)}"]`)];
    controls.forEach(control => {
      if (control.type === "radio") {
        control.checked = control.value === value;
      } else {
        control.value = value;
      }
    });
  });
  updateConnectionState();
  updateProgress();
}

function previewPayload() {
  let payload;
  try {
    payload = collectPayload({ validate: false });
  } catch {
    payload = { error: "미리보기를 생성할 수 없습니다." };
  }
  refs.payloadPreview.textContent = JSON.stringify(payload, null, 2);
  refs.payloadDialog.showModal();
}

function downloadCurrentPayload() {
  let payload;
  try {
    payload = collectPayload({ validate: false });
  } catch {
    return;
  }
  downloadJson(payload);
  showToast("JSON 파일로 저장했습니다.");
}

function downloadJson(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const filename = `evaluation-${payload.meta.systemType}-${payload.evaluator.ownGroupId || "group"}-${Date.now()}.json`;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function clearErrors() {
  const label = activeSystem === "peer" ? "조원평가" : "조별평가";
  refs.formStatus.textContent = `${label} 시스템이 선택되었습니다.`;
  refs.form.querySelectorAll(".has-error").forEach(node => node.classList.remove("has-error"));
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  refs.toast.textContent = message;
  refs.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => refs.toast.classList.remove("is-visible"), 2600);
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(value);
  }
  return String(value).replace(/["\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

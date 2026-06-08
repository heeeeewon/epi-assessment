const SHEETS = {
  submissions: "Submissions",
  peer: "PeerEvaluation",
  group: "GroupEvaluation"
};

const PEER_HEADERS = [
  "submittedAt",
  "courseName",
  "presentationDate",
  "evaluatorName",
  "studentId",
  "ownGroup",
  "targetMember",
  "targetGroup",
  "attendanceParticipation",
  "roleResponsibility",
  "researchContribution",
  "communicationCollaboration",
  "presentationContribution",
  "total",
  "maxScore",
  "comment"
];

const GROUP_HEADERS = [
  "submittedAt",
  "courseName",
  "presentationDate",
  "evaluatorName",
  "studentId",
  "ownGroup",
  "targetGroup",
  "targetMembers",
  "topicFit",
  "problemAnalysis",
  "evidenceUse",
  "precedeDiagnosis",
  "promotionStrategy",
  "presentationDelivery",
  "total",
  "maxScore",
  "comment"
];

function doGet() {
  return jsonResponse({
    ok: true,
    message: "Health promotion evaluation endpoint is ready."
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const payload = parsePayload(e);
    appendSubmission(payload);

    return jsonResponse({
      ok: true,
      receivedAt: new Date().toISOString()
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: String(error && error.message ? error.message : error)
    });
  } finally {
    lock.releaseLock();
  }
}

function parsePayload(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("No post body received.");
  }

  return JSON.parse(e.postData.contents);
}

function appendSubmission(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const meta = payload.meta || {};
  const evaluator = payload.evaluator || {};
  const submittedAt = meta.submittedAt || new Date().toISOString();

  appendRawRow(ss, submittedAt, payload);
  appendPeerRows(ss, submittedAt, meta, evaluator, payload.peerEvaluations || []);
  appendGroupRows(ss, submittedAt, meta, evaluator, payload.groupEvaluations || []);
}

function appendRawRow(ss, submittedAt, payload) {
  const sheet = ensureSheet(ss, SHEETS.submissions, ["submittedAt", "systemType", "systemName", "evaluatorName", "ownGroup", "rawJson"]);
  sheet.appendRow([
    submittedAt,
    valueAt(payload, "meta.systemType"),
    valueAt(payload, "meta.systemName"),
    valueAt(payload, "evaluator.name"),
    valueAt(payload, "evaluator.ownGroup"),
    JSON.stringify(payload)
  ]);
}

function appendPeerRows(ss, submittedAt, meta, evaluator, rows) {
  const sheet = ensureSheet(ss, SHEETS.peer, PEER_HEADERS);
  rows.forEach(row => {
    const scores = row.scores || {};
    sheet.appendRow([
      submittedAt,
      meta.courseName || "",
      meta.presentationDate || "",
      evaluator.name || "",
      evaluator.studentId || "",
      evaluator.ownGroup || "",
      row.targetName || "",
      row.targetGroup || "",
      asScore(scores.attendanceParticipation),
      asScore(scores.roleResponsibility),
      asScore(scores.researchContribution),
      asScore(scores.communicationCollaboration),
      asScore(scores.presentationContribution),
      asScore(row.total),
      asScore(row.maxScore),
      row.comment || ""
    ]);
  });
}

function appendGroupRows(ss, submittedAt, meta, evaluator, rows) {
  const sheet = ensureSheet(ss, SHEETS.group, GROUP_HEADERS);
  rows.forEach(row => {
    const scores = row.scores || {};
    sheet.appendRow([
      submittedAt,
      meta.courseName || "",
      meta.presentationDate || "",
      evaluator.name || "",
      evaluator.studentId || "",
      evaluator.ownGroup || "",
      row.targetGroup || "",
      Array.isArray(row.targetMembers) ? row.targetMembers.join(", ") : "",
      asScore(scores.topicFit),
      asScore(scores.problemAnalysis),
      asScore(scores.evidenceUse),
      asScore(scores.precedeDiagnosis),
      asScore(scores.promotionStrategy),
      asScore(scores.presentationDelivery),
      asScore(row.total),
      asScore(row.maxScore),
      row.comment || ""
    ]);
  });
}

function ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function asScore(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return Number(value);
}

function valueAt(object, path) {
  return path.split(".").reduce((current, key) => {
    if (current && Object.prototype.hasOwnProperty.call(current, key)) {
      return current[key];
    }
    return "";
  }, object);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

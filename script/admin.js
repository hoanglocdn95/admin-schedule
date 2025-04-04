const firstColColor = {
  student: {
    bg: "#07bdd0",
    text: "#000000",
  },
  trainer: {
    bg: "#ff9700",
    text: "#ffffff",
  },
};

const formatDate = (date) =>
  Utilities.formatDate(
    date,
    Session.getScriptTimeZone() || "GMT",
    "dd/MM/yyyy"
  );

// ✅ Hàm xử lý CORS
function sendCorsResponse(message = "OK") {
  var output = ContentService.createTextOutput(message);
  output.setMimeType(ContentService.MimeType.TEXT);

  return addCorsHeaders(output);
}

// ✅ Hàm gửi phản hồi JSON (Hỗ trợ CORS)
function sendJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);

  return addCorsHeaders(output);
}

// ✅ Hàm gửi phản hồi lỗi
function sendErrorResponse(status) {
  return sendJsonResponse({ result: "error", status });
}

// ✅ Hàm thêm CORS headers
function addCorsHeaders(response) {
  response.setContent(JSON.stringify({ message: response.getContent() }));
  return response;
}

// ✅ Hàm gửi phản hồi thành công
function sendSuccessResponse() {
  return sendJsonResponse({ result: "success", status: "ok" });
}

function LogToSheet(message) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs");

  logSheet.appendRow([new Date(), message]).setWrap(true);

  var maxRows = 100;
  var rowCount = logSheet.getLastRow();
  if (rowCount > maxRows) {
    logSheet.deleteRows(2, rowCount - maxRows);
  }
}

// ===============

function doPost(e) {
  try {
    // ✅ Xử lý request OPTIONS (Preflight CORS)
    if (e.parameter?.options === "true") {
      return sendCorsResponse();
    }

    var data = JSON.parse(e.postData.contents);

    if (data.type === "handle_student_schedule") {
      return handleScheduleSheet(data.scheduledData);
    }
  } catch (error) {
    return sendErrorResponse(error.message);
  }
}

function handleScheduleSheet(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var currentDate = new Date();
  let dayOfWeek = currentDate.getDay();
  var monday = new Date(currentDate);
  monday.setDate(
    currentDate.getDate() -
      (currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1)
  );

  if (dayOfWeek === 6 || dayOfWeek === 0) {
    monday.setDate(monday.getDate() + 7);
  }

  var sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fromTime = formatDate(monday);
  const toTime = formatDate(sunday);

  var sheetName = `SCHEDULE :${fromTime} - ${toTime}`;

  var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  sheet.clear();

  // Tiêu đề
  sheet
    .getRange("A1:C1")
    .merge()
    .setValue("STUDENTS WEEKLY SCHEDULE")
    .setFontWeight("bold")
    .setBackground(firstColColor.student.bg)
    .setFontColor(firstColColor.student.text);
  // .setHorizontalAlignment("center");
  sheet.getRange("A2").setValue("From");
  sheet.getRange("A3").setValue("To");
  sheet.getRange("B2").setValue(fromTime);
  sheet.getRange("B3").setValue(toTime);

  var headers = [
    "Name",
    "Timezone",
    "Email",
    "Facebook",
    "Cú Pháp Zoom",
    "Status",
    "Notes",
    `Monday (${fromTime})`,
    `Tuesday (${formatDate(new Date(monday.setDate(monday.getDate() + 1)))})`,
    `Wednesday (${formatDate(new Date(monday.setDate(monday.getDate() + 2)))})`,
    `Thursday (${formatDate(new Date(monday.setDate(monday.getDate() + 3)))})`,
    `Friday (${formatDate(new Date(monday.setDate(monday.getDate() + 4)))})`,
    `Saturday (${formatDate(new Date(monday.setDate(monday.getDate() + 5)))})`,
    `Sunday (${toTime})`,
  ];

  sheet
    .getRange(5, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("top")
    .setBackground("#cccccc");

  if (data && data.length > 0) {
    sheet.getRange(6, 1, data.length, headers.length).setValues(data);
  } else {
    Logger.log("Không có dữ liệu để nhập vào sheet.");
  }

  var lastRow = sheet.getLastRow();
  Logger.log("lastRow", lastRow);
  if (lastRow > 5) {
    sheet
      .getRange(5, 1, lastRow - 4, headers.length)
      .setBorder(true, true, true, true, true, true);
  }

  sheet.getDataRange().setWrap(true);
  sheet.autoResizeRows(1, lastRow - 4);
  sheet.autoResizeColumns(1, headers.length);

  return sendSuccessResponse();
}

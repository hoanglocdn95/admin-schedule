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

  logSheet.appendRow([new Date(), message]);

  var maxRows = 100;
  var rowCount = logSheet.getLastRow();
  if (rowCount > maxRows) {
    logSheet.deleteRows(2, rowCount - maxRows);
  }
}

function extractWeekDatesFromSheetName(sheetName) {
  const match = sheetName.match(
    /SCHEDULE:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/
  );
  if (!match) {
    throw new Error(
      "Tên sheet không đúng định dạng: SCHEDULE:dd/MM/yyyy - dd/MM/yyyy"
    );
  }

  const startDateStr = match[1]; // ngày bắt đầu (Monday)
  const [day, month, year] = startDateStr.split("/").map(Number);
  const startDate = new Date(year, month - 1, day);

  const result = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const formatted = Utilities.formatDate(
      date,
      Session.getScriptTimeZone(),
      "dd/MM/yyyy"
    );
    result.push(formatted);
  }

  return result;
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
      return handleScheduleSheet(
        data.sheetName,
        data.scheduledData,
        +data.indexRow
      );
    }
  } catch (error) {
    return sendErrorResponse(error.message);
  }
}

function doGet(e) {
  const type = e.parameter.type;

  if (type === "get_schedule_sheet") {
    return getScheduleSheetData();
  }

  if (type === "get_schedule_by_name") {
    return getScheduleBySheetName(e.parameter.sheetName);
  }

  return ContentService.createTextOutput(
    JSON.stringify({ success: false, message: "Missing type in parameter" })
  ).setMimeType(ContentService.MimeType.JSON);
}

function handleScheduleSheet(sheetName, data, indexRow) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  const weekDates = extractWeekDatesFromSheetName(sheetName);

  let headerDates = [];

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  weekDates.forEach((date, i) => {
    headerDates.push(`${days[i]} (${date})`);
    LogToSheet(`${days[i]} (${date})`);
  });

  const headers = [
    "Name",
    "Timezone",
    "Email",
    "Facebook",
    "Cú Pháp Zoom",
    "Status",
    "Notes",
    ...headerDates,
  ];

  let sheet = ss.getSheetByName(sheetName);

  let lastRow = sheet ? sheet.getLastRow() : 0;

  if (!sheet || lastRow < indexRow + 6) {
    sheet = ss.insertSheet(sheetName);

    sheet
      .getRange("A1:C1")
      .merge()
      .setValue("STUDENTS WEEKLY SCHEDULE")
      .setFontWeight("bold")
      .setBackground(firstColColor.student.bg)
      .setFontColor(firstColColor.student.text);
    sheet.getRange("A2").setValue("From");
    sheet.getRange("A3").setValue("To");
    sheet.getRange("B2").setValue(fromTime);
    sheet.getRange("B3").setValue(toTime);

    sheet
      .getRange(5, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("top")
      .setBackground("#cccccc");

    if (data && data.length > 0) {
      sheet.getRange(6, 1, data.length, headers.length).setValues(data);

      for (let row = 6; row < 6 + data.length; row++) {
        for (let col = 8; col <= 14; col++) {
          const cell = sheet.getRange(row, col);

          const rawText = cell.getValue();
          if (!rawText) continue;

          applyRichTextToCell(cell, rawText);
        }
      }
      /////
    } else {
      LogToSheet("Không có dữ liệu để nhập vào sheet.");
    }
  } else {
    if (data && data.length > 0) {
      sheet
        .getRange(indexRow + 6, 1, 1, headers.length)
        .setValues([data[indexRow]]);

      for (let col = 8; col <= 14; col++) {
        const cell = sheet.getRange(indexRow + 6, col);

        const rawText = cell.getValue();
        if (!rawText) continue;

        applyRichTextToCell(cell, rawText);
      }
    } else {
      LogToSheet(`Không có dữ liệu để nhập vào sheet tại hàng ${indexRow + 6}`);
    }
  }

  /////

  lastRow = sheet.getLastRow();
  if (lastRow > 5) {
    sheet
      .getRange(5, 1, lastRow - 4, headers.length)
      .setBorder(true, true, true, true, true, true);
    sheet.autoResizeRows(1, lastRow - 4);
  }

  sheet.getDataRange().setWrap(true);
  sheet.autoResizeColumns(1, headers.length);

  return sendSuccessResponse();
}

function getScheduleBySheetName(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return sendJsonResponse({
      success: false,
      message: `Sheet "${sheetName}" not found.`,
    });
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  // Dữ liệu bắt đầu từ dòng 6 (dòng 1–5 là tiêu đề + thông tin phụ)
  if (lastRow <= 5) {
    return sendJsonResponse({
      success: true,
      data: [],
      message: "No data rows found in the schedule.",
    });
  }

  const dataRange = sheet.getRange(6, 1, lastRow - 5, lastCol);
  const data = dataRange.getValues();

  return sendJsonResponse({
    success: true,
    data,
  });
}

function applyRichTextToCell(cell, rawText) {
  const lines = rawText.toString().split("\n");
  let fullText = "";
  let segments = [];

  lines.forEach((line) => {
    const match = line.match(/^(.*?)#(.*?)#$/);
    if (match) {
      const text = match[1].trim();
      const color = match[2].trim();
      segments.push({ text, color });
      fullText += text + "\n";
    } else {
      segments.push({ text: line, color: "#000000" });
      fullText += line + "\n";
    }
  });

  try {
    fullText = fullText.trimEnd();
    const builder = SpreadsheetApp.newRichTextValue().setText(fullText);
    let start = 0;

    segments.forEach(({ text, color }) => {
      const style = SpreadsheetApp.newTextStyle()
        .setForegroundColor(color)
        .build();
      builder.setTextStyle(start, start + text.length, style);
      start += text.length + 1;
    });

    const built = builder.build();

    cell.setRichTextValue(built);
  } catch (err) {
    LogToSheet(`Error building rich text: ${err.message}`);
  }
}

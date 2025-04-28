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

function sendCorsResponse(message = "OK") {
  return addCorsHeaders(
    ContentService.createTextOutput(message).setMimeType(
      ContentService.MimeType.TEXT
    )
  );
}

function sendJsonResponse(data) {
  return addCorsHeaders(
    ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
      ContentService.MimeType.JSON
    )
  );
}

function sendErrorResponse(status) {
  return sendJsonResponse({ result: "error", status });
}

function addCorsHeaders(response) {
  response.setContent(JSON.stringify({ message: response.getContent() }));
  return response;
}

function sendSuccessResponse() {
  return sendJsonResponse({ result: "success", status: "ok" });
}

function LogToSheet(message) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs");
  logSheet.appendRow([new Date(), message]);
  const maxRows = 100;
  const rowCount = logSheet.getLastRow();
  if (rowCount > maxRows) logSheet.deleteRows(2, rowCount - maxRows);
}

function extractWeekDatesFromSheetName(sheetName) {
  const match = sheetName.match(
    /SCHEDULE:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/
  );
  if (!match)
    throw new Error(
      "Tên sheet không đúng định dạng: SCHEDULE:dd/MM/yyyy - dd/MM/yyyy"
    );

  const [day, month, year] = match[1].split("/").map(Number);
  const startDate = new Date(year, month - 1, day);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    return formatDate(date);
  });
}

function doPost(e) {
  try {
    if (e.parameter?.options === "true") return sendCorsResponse();
    const data = JSON.parse(e.postData.contents);
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
  if (type === "get_schedule_by_name")
    return getScheduleBySheetName(e.parameter.sheetName);
  return sendJsonResponse({
    success: false,
    message: "Missing type in parameter",
  });
}

function handleScheduleSheet(sheetName, data, indexRow) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const weekDates = extractWeekDatesFromSheetName(sheetName);

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const headerDates = weekDates.map((date, i) => `${days[i]} (${date})`);

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
  let isNewSheet = false;

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    isNewSheet = true;

    // Setup tiêu đề
    sheet
      .getRange("A1:C1")
      .merge()
      .setValue("STUDENTS WEEKLY SCHEDULE")
      .setFontWeight("bold")
      .setBackground(firstColColor.student.bg)
      .setFontColor(firstColColor.student.text);

    sheet.getRange("A2").setValue("From");
    sheet.getRange("A3").setValue("To");
    sheet.getRange("B2").setValue(weekDates[0]);
    sheet.getRange("B3").setValue(weekDates[6]);

    sheet
      .getRange(5, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("top")
      .setBackground("#cccccc");
  }

  if (data && data.length > 0) {
    if (isNewSheet) {
      // ✅ Ghi toàn bộ data nếu sheet mới
      sheet.getRange(6, 1, data.length, headers.length).setValues(data);

      for (let row = 6; row < 6 + data.length; row++) {
        for (let col = 8; col <= 14; col++) {
          const cell = sheet.getRange(row, col);
          const rawText = cell.getValue();
          if (rawText) applyRichTextToCell(cell, rawText);
        }
      }
    } else {
      // ✅ Chỉ cập nhật 1 dòng nếu sheet đã có
      const targetRow = sheet.getLastRow() < indexRow + 6 ? 6 : indexRow + 6;
      sheet
        .getRange(targetRow, 1, 1, headers.length)
        .setValues([data[indexRow]]);

      for (let col = 8; col <= 14; col++) {
        const cell = sheet.getRange(targetRow, col);
        const rawText = cell.getValue();
        if (rawText) applyRichTextToCell(cell, rawText);
      }
    }
  } else {
    LogToSheet(`Không có dữ liệu để nhập vào sheet tại hàng ${indexRow + 6}`);
  }

  const updatedLastRow = sheet.getLastRow();
  if (updatedLastRow > 5) {
    sheet
      .getRange(5, 1, updatedLastRow - 4, headers.length)
      .setBorder(true, true, true, true, true, true);
    sheet.autoResizeRows(1, updatedLastRow - 4);
  }

  sheet.getDataRange().setWrap(true);
  sheet.autoResizeColumns(1, headers.length);

  return sendSuccessResponse();
}

function getScheduleBySheetName(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet)
    return sendJsonResponse({
      success: false,
      message: `Sheet "${sheetName}" not found.`,
    });

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 5)
    return sendJsonResponse({
      success: true,
      data: [],
      message: "No data rows found.",
    });

  const data = sheet.getRange(6, 1, lastRow - 5, lastCol).getValues();
  return sendJsonResponse({ success: true, data });
}

function applyRichTextToCell(cell, rawText) {
  const lines = rawText.toString().split("\n");
  let fullText = "";
  const segments = [];

  lines.forEach((line) => {
    const match = line.match(/^(.*?)#(.*?)#$/);
    const text = match ? match[1].trim() : line;
    const color = match ? match[2].trim() : "#000000";
    segments.push({ text, color });
    fullText += text + "\n";
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

    cell.setRichTextValue(builder.build());
  } catch (err) {
    LogToSheet(`Error building rich text: ${err.message}`);
  }
}

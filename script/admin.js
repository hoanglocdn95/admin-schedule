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

function doGet(e) {
  const type = e.parameter.type;

  if (type === "get_schedule_sheet") {
    return getScheduleSheetData();
  }

  return ContentService.createTextOutput(
    JSON.stringify({ success: false, message: "Missing type in parameter" })
  ).setMimeType(ContentService.MimeType.JSON);
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

  let headerDates = [];
  for (let i = 0; i < 7; i++) {
    let d = new Date(monday);
    d.setDate(monday.getDate() + i);
    headerDates.push(
      `${
        [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ][i]
      } (${formatDate(d)})`
    );
  }

  var headers = [
    "Name",
    "Timezone",
    "Email",
    "Facebook",
    "Cú Pháp Zoom",
    "Status",
    "Notes",
    ...headerDates,
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

    /////
    // BẮT ĐẦU xử lý màu dòng riêng từ cột H đến N
    for (let row = 6; row < 6 + data.length; row++) {
      for (let col = 8; col <= 14; col++) {
        const cell = sheet.getRange(row, col);

        const rawText = cell.getValue();
        if (!rawText) continue;
        LogToSheet("rawText" + " : " + rawText);

        const lines = rawText.toString().split("\n");
        // const builder = SpreadsheetApp.newRichTextValue();
        let fullText = "";
        let segments = [];

        lines.forEach((line) => {
          const match = line.match(/^(.*?)#(.*?)#$/); // Tách phần text và color
          if (match) {
            const text = match[1].trim(); // "hh:mm-hh:mm (trainer)"
            const color = match[2].trim(); // mã màu
            LogToSheet(text + " - " + color);
            segments.push({ text, color });
            fullText += text + "\n";
          } else {
            segments.push({ text: line, color: "#000000" });
            fullText += line + "\n";
          }
        });

        fullText = fullText.trimEnd(); // bỏ dòng thừa

        // builder.setText(fullText);
        const builder = SpreadsheetApp.newRichTextValue().setText(fullText);

        let start = 0;
        segments.forEach(({ text, color }) => {
          LogToSheet("segments: " + text + " - " + color);
          const style = SpreadsheetApp.newTextStyle()
            .setForegroundColor(color)
            .build();
          builder.setTextStyle(start, start + text.length, style);
          start += text.length + 1;
        });

        cell.setRichTextValue(builder.build());
      }
    }
    /////
  } else {
    Logger.log("Không có dữ liệu để nhập vào sheet.");
  }

  var lastRow = sheet.getLastRow();
  LogToSheet("lastRow" + " : " + lastRow);
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

function getScheduleSheetData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const currentDate = new Date();

  // Tính ngày thứ 2 của tuần hiện tại
  let dayOfWeek = currentDate.getDay();
  let monday = new Date(currentDate);
  monday.setDate(currentDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  // Nếu là thứ 7 hoặc CN thì lấy tuần kế tiếp
  if (dayOfWeek === 6 || dayOfWeek === 0) {
    monday.setDate(monday.getDate() + 7);
  }

  let sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fromTime = formatDate(monday);
  const toTime = formatDate(sunday);
  const sheetName = `SCHEDULE :${fromTime} - ${toTime}`;

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

function extractHashData(input) {
  const match = input.match(/#(.*?)#/);
  const hashValue = match ? match[1] : null;
  const cleaned = input.replace(/#.*?#/, "").trim();

  return {
    value: cleaned,
    color: hashValue,
  };
}

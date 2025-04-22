const SCHEDULE_API_URL =
  "https://script.google.com/macros/s/AKfycbxpKKS1fHni-dmEpXyGLCreE43qBxJpPiKXHJONLXn2N0vLGwjGNhzbY_ODBIolR4ePvA/exec";

const ACCOUNT_API_URL =
  "https://script.google.com/macros/s/AKfycbxa7-dhPgo48Q3eVKnQjQNKI8oi4ykDfnTzi9hQDSfhGk2SrMBimc1yagzxXLULNs7tYQ/exec";

const ADMIN_API_URL =
  "https://script.google.com/macros/s/AKfycbyKCKBT7dgqAk0IxKt-ZTdY4Fx2i10bJxH0OHnWw-C76iRg9ffsDT9JAVGfXP05EdpxaQ/exec";

const REMAIN_TIME_TO_EDIT = 5;

const SHEET_TYPE = {
  SCHEDULE: "SCHEDULE",
  TRAINER: "TRAINER",
  STUDENT: "STUDENT",
};

let studentData = [];
let trainerData = [];

let studentCalendar = {};
let trainerCalendar = {};

let scheduleSheetData = [];

const dayOfCurrentWeek = [];

const WEEK = {
  CURRENT: "current",
  LAST: "last",
  NEXT: "next",
};

let selectedDate = new Date();

let observingWeek = WEEK.CURRENT;

let currentScheduledData = Array.from({ length: 3 }, () => Array(7).fill(""));

const userInfo = JSON.parse(sessionStorage.getItem("user_info"));

if (!sessionStorage.getItem("user_email")) {
  window.location.href = "index.html";
}
if (!sessionStorage.getItem("user_info")) {
  window.location.href = "admin.html";
}

function formatTime(value) {
  return value && value.length < 5 ? "0" + value : value;
}

function logout() {
  sessionStorage.clear();
  window.location.href = "index.html";
}

function addUserInfoToSchedule(scheduleData, email, name, timezone) {
  return scheduleData.map((row) =>
    row.map((cell) => {
      if (cell.trim() !== "") {
        const times = cell.split(",").join(", ");
        return `${name} - ${timezone} - ${email} (${times})`;
      }
      return cell;
    })
  );
}

const getAllUser = async () => {
  await fetch(`${ACCOUNT_API_URL}?type=get_all_user`, {
    method: "GET",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  })
    .then(async (response) => {
      const data = await response.json();
      if (data.success) {
        if (data.student) studentData = data.student;
        if (data.trainer) trainerData = data.trainer;
      }
    })
    .catch((error) => {
      console.error("Lỗi khi lấy dữ liệu:", error);
    });
};

function parseSchedule(allData) {
  const result = {};

  allData.forEach((dayData, sessionIndex) => {
    dayData.forEach((entry, dayIndex) => {
      if (!entry) return;

      const lines = entry.split("\n");
      lines.forEach((line) => {
        const match = line.match(
          /^(.+?) - \(GMT [^)]*\) [^-]+- ([^ ]+) \((.+)\)$/
        );
        if (match) {
          const name = match[1].trim();
          const email = match[2].trim();
          let time = match[3].trim();

          if (!result[email]) {
            result[email] = {
              name,
              email,
              times: Array(7)
                .fill(null)
                .map(() => []),
            };
          }
          time = time.split(",").map((t) => t.trim());

          result[email].times[dayIndex].push(...time);
        }
      });
    });
  });
  return result;
}

const getCalendarByType = async (type) => {
  try {
    const response = await fetch(
      `${SCHEDULE_API_URL}?type=get_calendar&sheetName=${getSheetNames(type)}`,
      {
        redirect: "follow",
        method: "GET",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      }
    );

    const { success, message, data } = await response.json();

    if (type === SHEET_TYPE.STUDENT) {
      studentCalendar = success ? parseSchedule(data) : {};
    } else if (type === SHEET_TYPE.TRAINER) {
      trainerCalendar = success ? parseSchedule(data) : {};
    }
  } catch (error) {
    console.error(`Lỗi khi lấy dữ liệu ${type}:`, error);
  }
};

function generateSchedule(index, day) {
  const scheduleContainer = document.getElementById("modal-schedule");
  scheduleContainer.innerHTML = "";

  const leisureTime = (studentData[index].times || [])[day];
  if (!leisureTime) return;

  leisureTime.flat().forEach((time, i) => {
    const [start, end] = time.split("-");

    const row = document.createElement("div");
    row.innerHTML = `
          <label>Khung giờ ${i + 1}:</label>
          <p>Từ <b>${start}</b> đến <b>${end}</b></p>
        `;
    scheduleContainer.appendChild(row);
  });
}

function extractOffset(timezoneStr) {
  var match = timezoneStr.match(/\(GMT ([+-]\d{1,2}):(\d{2})\)/);
  if (!match) throw new Error("Invalid timezone format: " + timezoneStr);
  var hours = parseInt(match[1], 10);
  var minutes = parseInt(match[2], 10);
  return hours + minutes / 60;
}

function convertTimeRange(timeRange, offsetDiff) {
  return timeRange
    .split("-")
    .map((time) => {
      var [hh, mm] = time.split(":").map(Number);
      var totalMinutes = hh * 60 + mm + offsetDiff * 60;
      if (totalMinutes < 0) totalMinutes += 1440; // Điều chỉnh nếu âm
      if (totalMinutes >= 1440) totalMinutes -= 1440; // Điều chỉnh nếu quá 24h
      var newHh = Math.floor(totalMinutes / 60);
      var newMm = totalMinutes % 60;
      return `${String(newHh).padStart(2, "0")}:${String(newMm).padStart(
        2,
        "0"
      )}`;
    })
    .join("-");
}

function convertWeeklyTimes(times, originTimezone, targetTimezone) {
  var originOffset = extractOffset(originTimezone);
  var targetOffset = extractOffset(targetTimezone);
  var offsetDiff = targetOffset - originOffset;

  return times.map((day) =>
    day.map((timeRange) => convertTimeRange(timeRange, offsetDiff))
  );
}

const convertTimeByTimezone = (timeRange, originTimezone, targetTimezone) => {
  const originOffset = extractOffset(originTimezone);
  const targetOffset = extractOffset(targetTimezone);
  const offsetDiff = targetOffset - originOffset;

  return convertTimeRange(timeRange, offsetDiff);
};

function parseTimeTrainerString(input) {
  const lines = input.split("\n");
  const result = [];

  lines.forEach((line) => {
    const match = line.match(/^(.+?)\s*\((.+)-(.+@.+)\)$/);

    if (match) {
      const time = match[1].trim();
      const name = match[2].trim();
      const email = match[3].trim();
      const color =
        trainerData.filter((tr) => tr.email === email)[0]?.color || "#000000";

      result.push({
        time,
        trainerName: name,
        trainerEmail: email,
        color,
      });
    } else {
      console.warn("Không đúng định dạng:", line);
    }
  });

  return result;
}

// Hàm clone date và cộng ngày
const cloneAndOffset = (date, offset) => {
  let d = new Date(date);
  d.setDate(d.getDate() + offset);
  return d;
};

const formatDate = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Tháng bắt đầu từ 0
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

function getSheetNames(sheetType) {
  if (!selectedDate || isNaN(new Date(selectedDate))) {
    throw new Error("Invalid selectedDate");
  }

  const selected = new Date(selectedDate);
  const dayOfWeek = selected.getDay();

  let monday = new Date(selected);
  monday.setDate(selected.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const mondayWeek = new Date(monday);
  const sundayWeek = new Date(mondayWeek);
  sundayWeek.setDate(mondayWeek.getDate() + 6);

  return `${SHEET_TYPE[sheetType]}:${formatDate(mondayWeek)} - ${formatDate(
    sundayWeek
  )}`;
}

const handleStudentData = () => {
  studentData = studentData.map((s, index) => {
    if (studentCalendar[s.email]) {
      const scheduleCalendar =
        scheduleSheetData.length > 0 && scheduleSheetData[index]
          ? scheduleSheetData[index]
              .slice(-7)
              .map((i) => parseTimeTrainerString(i))
          : Array(7).fill([]);

      let status = "";
      let adminNote = "";
      if (scheduleSheetData[index]) {
        status = scheduleSheetData[index][5] || "";
        adminNote = scheduleSheetData[index][6] || "";
      }

      studentCalendar[s.email] = { ...studentCalendar[s.email], ...s };
      return {
        ...s,
        times: studentCalendar[s.email].times.map((day) =>
          day.map((timeRange) => {
            return convertTimeByTimezone(
              timeRange,
              s.timezone,
              userInfo.timezone
            );
          })
        ),
        email: studentCalendar[s.email].email,
        classes: scheduleCalendar,
        status,
        adminNote,
      };
    }
    return {
      ...s,
      times: Array(7)
        .fill(null)
        .map(() => []),
      classes: Array(7)
        .fill(null)
        .map(() => []),
      status: "",
      adminNote: "",
    };
  });
};

const handleTrainerData = () => {
  trainerData = trainerData.map((s, index) => {
    if (trainerCalendar[s.email]) {
      trainerCalendar[s.email] = { ...trainerCalendar[s.email], ...s };
      return {
        ...s,
        times: trainerCalendar[s.email].times.map((day) =>
          day.map((timeRange) => {
            return convertTimeByTimezone(
              timeRange,
              s.timezone,
              userInfo.timezone
            );
          })
        ),
        email: trainerCalendar[s.email].email,
      };
    }
    return {
      ...s,
      times: Array(7)
        .fill(null)
        .map(() => []),
    };
  });
};

function formatDateToString(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function generateHeaders() {
  const days = [
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
    "Chủ nhật",
  ];

  let dayOfWeek = selectedDate.getDay();
  let monday = new Date(selectedDate);
  monday.setDate(
    selectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
  );

  let weekDates = [];
  for (let i = 0; i < 7; i++) {
    let d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(formatDateToString(d)); // dd/MM/yyyy
  }

  let headerRow = document.getElementById("table-header");
  let trainerHeaderRow = document.getElementById("trainer-table-header");

  headerRow.innerHTML = `<th style="min-width: 135px; background: #07bcd0">Tên</th>`;
  trainerHeaderRow.innerHTML = `
    <th style="min-width: 135px; background: #1e00ff; color: #ffffff">Tên</th>
  `;
  dayOfCurrentWeek.length = 0; // Clear global if used

  weekDates.forEach((date, i) => {
    let th = document.createElement("th");
    let thTrainer = document.createElement("th");

    const dayText = `${days[i]} (${date})`;
    dayOfCurrentWeek.push(dayText);

    th.textContent = dayText;
    th.className = "th-day";
    headerRow.appendChild(th);

    thTrainer.textContent = dayText;
    thTrainer.className = "th-day";
    thTrainer.style.backgroundColor = "#36e13c";
    trainerHeaderRow.appendChild(thTrainer);
  });
}

const SCHEDULE_API_URL =
  "https://script.google.com/macros/s/AKfycbx-9-NGKQT1BPE30EoY_s2bauw1OWfIMxX_cGMBPGDBPCvBPwLB4FfQE5yzjEJ3cqltEw/exec";

const ACCOUNT_API_URL =
  "https://script.google.com/macros/s/AKfycbxa7-dhPgo48Q3eVKnQjQNKI8oi4ykDfnTzi9hQDSfhGk2SrMBimc1yagzxXLULNs7tYQ/exec";

const ADMIN_API_URL =
  "https://script.google.com/macros/s/AKfycby1OScWjdvUvt98LgX6G19EUy--UsuMJMCwpT3vjSl3HPZh4SGUbnh71oyr1HbSZsyFRg/exec";

const REMAIN_TIME_TO_EDIT = 5;

const SHEET_TYPE = {
  SCHEDULE: "SCHEDULE",
  TRAINER: "TRAINER",
  STUDENT: "STUDENT",
};

const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

let studentData = [];
let trainerData = [];

let studentCalendar = {};
let trainerCalendar = {};

let scheduleSheetData = [];

const dayOfCurrentWeek = [];

let isShowTrainer = true;
let isShowStudent = true;

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

// Hàm hỗ trợ lấy offset từ timezone string như "GMT +09:30"
function getOffset(tz) {
  const match = tz.match(/GMT\s*([+-])(\d{1,2}):(\d{2})/i);
  if (!match) return 0;
  const [, sign, h, m] = match;
  const offset = parseInt(h) * 60 + parseInt(m);
  return sign === "+" ? offset : -offset;
}

function logout() {
  sessionStorage.clear();
  window.location.href = "index.html";
}

function addUserInfoToSchedule(scheduleData, email, name, timezone) {
  return scheduleData.map((row) =>
    row.map((cell) => {
      if (cell && cell.trim() !== "") {
        const times = cell.split(",").join(", ");
        return `${name} - ${timezone} - ${email} (${times})`;
      }
      return cell;
    })
  );
}

function toggleScheduleTrainer(btn) {
  const trainerCalendarContainer = document.querySelector(
    ".trainer-calendar-container"
  );
  const studentCalendarContainer = document.querySelector(
    ".student-calendar-container"
  );
  const toggleStudentBtn = document.getElementById("toggle-student-btn");
  if (isShowTrainer) {
    if (isShowStudent) {
      btn.innerText = "Show Trainer";
      isShowTrainer = false;
      trainerCalendarContainer.style.width = "0";
      studentCalendarContainer.style.width = "100%";
    } else {
      btn.innerText = "Show Trainer";
      studentCalendarContainer.style.width = "100%";
      trainerCalendarContainer.style.width = "0";
      toggleStudentBtn.innerText = "Hide Student";
    }
  } else {
    btn.innerText = "Hide Trainer";
    isShowTrainer = true;
    if (isShowStudent) {
      trainerCalendarContainer.style.width = "50%";
      studentCalendarContainer.style.width = "50%";
    } else {
      trainerCalendarContainer.style.width = "100%";
    }
  }
}

function toggleScheduleStudent(btn) {
  const toggleTrainerBtn = document.getElementById("toggle-trainer-btn");
  const trainerCalendarContainer = document.querySelector(
    ".trainer-calendar-container"
  );
  const studentCalendarContainer = document.querySelector(
    ".student-calendar-container"
  );
  if (isShowStudent) {
    if (isShowTrainer) {
      isShowStudent = false;
      btn.innerText = "Show Student";
      trainerCalendarContainer.style.width = "100%";
      studentCalendarContainer.style.width = "0";
    } else {
      btn.innerText = "Show Student";
      trainerCalendarContainer.style.width = "100%";
      studentCalendarContainer.style.width = "0";
      toggleTrainerBtn.innerText = "Hide Trainer";
    }
  } else {
    btn.innerText = "Hide Student";
    isShowStudent = true;
    if (isShowTrainer) {
      trainerCalendarContainer.style.width = "50%";
      studentCalendarContainer.style.width = "50%";
    } else {
      studentCalendarContainer.style.width = "100%";
    }
  }
}

function toggleHeaderNav(btn) {
  const headerNav = document.getElementById("header-nav");
  const calendarContainer = document.querySelector(".calendar-container");
  const trainerCalendarContainer = document.querySelector(
    ".trainer-calendar-container"
  );
  const studentCalendarContainer = document.querySelector(
    ".student-calendar-container"
  );

  if (headerNav.style.display === "none") {
    headerNav.style.display = "block";
    btn.innerText = "Hide Header";
    calendarContainer.style.marginTop = "156px";
    trainerCalendarContainer.style.height = "calc(100vh - 226px)";
    studentCalendarContainer.style.height = "calc(100vh - 226px)";
  } else {
    headerNav.style.display = "none";
    btn.innerText = "Show Header";
    calendarContainer.style.marginTop = "16px";
    trainerCalendarContainer.style.height = "calc(100vh - 86px)";
    studentCalendarContainer.style.height = "calc(100vh - 86px)";
  }
}

const getAllUser = async () => {
  try {
    const response = await fetch(`${ACCOUNT_API_URL}?type=get_all_user`, {
      method: "GET",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    const data = await response.json();
    if (data.success) {
      if (data.student) studentData = data.student;
      if (data.trainer) trainerData = data.trainer;
    }
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu:", error);
  }
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
  const currentSheetName = getSheetNames(type);
  try {
    const response = await fetch(
      `${SCHEDULE_API_URL}?type=get_calendar&sheetName=${currentSheetName}`,
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
  const match = timezoneStr.match(/\(GMT ([+-]\d{1,2}):(\d{2})\)/);
  if (!match) throw new Error("Invalid timezone format: " + timezoneStr);
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours + minutes / 60;
}

function convertTimeRange(timeRange, offsetDiff) {
  return timeRange
    .split("-")
    .map((time) => {
      const [hh, mm] = time.split(":").map(Number);
      let totalMinutes = hh * 60 + mm + offsetDiff * 60;
      if (totalMinutes < 0) totalMinutes += 1440; // Điều chỉnh nếu âm
      if (totalMinutes >= 1440) totalMinutes -= 1440; // Điều chỉnh nếu quá 24h
      const newHh = Math.floor(totalMinutes / 60);
      const newMm = totalMinutes % 60;
      return `${String(newHh).padStart(2, "0")}:${String(newMm).padStart(
        2,
        "0"
      )}`;
    })
    .join("-");
}

function convertWeeklyTimes(times, originTimezone, targetTimezone) {
  const originOffset = extractOffset(originTimezone);
  const targetOffset = extractOffset(targetTimezone);
  const offsetDiff = targetOffset - originOffset;

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

function parseTimeTrainerString(input, studentTimezone) {
  const lines = input.split("\n");
  const result = [];

  lines.forEach((line) => {
    const match = line.match(/^(.+?)\s*\((.+)-(.+@.+)\)$/);

    if (match) {
      const time = match[1].trim();
      const convertedTime = time
        ? convertTimeByTimezone(time, studentTimezone, userInfo.timezone)
        : "";
      const name = match[2].trim();
      const email = match[3].trim();
      const color =
        trainerData.filter((tr) => tr.email === email)[0]?.color || "#000000";

      result.push({
        time: convertedTime,
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

  const sn = `${SHEET_TYPE[sheetType]}:${formatDate(mondayWeek)} - ${formatDate(
    sundayWeek
  )}`;
  console.log(" sn ~ sn:", sn);

  return sn;
}

const handleStudentData = () => {
  studentData = studentData.map((s, index) => {
    let status = "";
    let adminNote = "";
    if (scheduleSheetData[index]) {
      status = scheduleSheetData[index][5] || "";
      adminNote = scheduleSheetData[index][6] || "";
    }

    if (studentCalendar[s.email]) {
      const scheduleCalendar =
        scheduleSheetData.length > 0 && scheduleSheetData[index]
          ? scheduleSheetData[index]
              .slice(-7)
              .map((i) => parseTimeTrainerString(i, s.timezone))
          : Array(7)
              .fill(null)
              .map(() => []);

      studentCalendar[s.email] = { ...studentCalendar[s.email], ...s };

      return {
        ...s,
        times: studentCalendar[s.email].times.map((day) =>
          day.map((timeRange) => {
            const convertedTime = convertTimeByTimezone(
              timeRange,
              s.timezone,
              userInfo.timezone
            );
            return convertedTime;
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
      status,
      adminNote,
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

function generateStudentHeaders() {
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

  // Cột đầu tiên: Tên học viên
  headerRow.innerHTML = `
    <th style="background: #07bcd0; z-index: 2;" class="th-day">Tên</th>
    <th style="background: #85d28f; z-index: 2; position: sticky; left: 200px;" class="th-day th-day-150">Trạng thái</th>
    <th style="background: #f6b900; z-index: 2; position: sticky; left: 350px;" class="th-day th-day-150">Ghi chú</th>
  `;

  dayOfCurrentWeek.length = 0; // Reset global

  weekDates.forEach((date, i) => {
    let th = document.createElement("th");

    const dayText = `${days[i]} (${date})`;
    dayOfCurrentWeek.push(dayText);

    th.textContent = dayText;
    th.className = "th-day";
    headerRow.appendChild(th);
  });
}

function generateTrainerHeaders() {
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

  let trainerHeaderRow = document.getElementById("trainer-table-header");

  trainerHeaderRow.innerHTML = `<th style="background: #07bcd0; z-index: 2;" class="th-day">Tên</th>`;

  weekDates.forEach((date, i) => {
    let thTrainer = document.createElement("th");

    const dayText = `${days[i]} (${date})`;

    thTrainer.textContent = dayText;
    thTrainer.className = "th-day";
    thTrainer.style.backgroundColor = "#36e13c";
    trainerHeaderRow.appendChild(thTrainer);
  });
}

const showWeekRange = () => {
  const dateStr = document.getElementById("dateInput").value;
  console.log(" showWeekRange ~ dateStr:", dateStr);
  if (!dateStr) return;

  selectedDate = new Date(dateStr);
  console.log(" showWeekRange ~ selectedDate:", selectedDate);
  const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, ...

  const monday = new Date(selectedDate);
  monday.setDate(
    selectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
  );

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fromDate = formatDate(monday);
  const toDate = formatDate(sunday);
  console.log(" showWeekRange ~ fromDate:", { fromDate, toDate });

  document.getElementById("result").textContent = `${fromDate} - ${toDate}`;
  initCalendar(fromDate, toDate);
};

const SCHEDULE_API_URL =
  "https://script.google.com/macros/s/AKfycbwtILUETUz9y88i18G0vVdSuS0WtYZnq4P-oP7C3HrtJi_v2SoOU5fy3khec_kL2p38xg/exec";

const ACCOUNT_API_URL =
  "https://script.google.com/macros/s/AKfycbxa7-dhPgo48Q3eVKnQjQNKI8oi4ykDfnTzi9hQDSfhGk2SrMBimc1yagzxXLULNs7tYQ/exec";

const ADMIN_API_URL =
  "https://script.google.com/macros/s/AKfycbwxu7N-pXujHFs_ciMfr6Zv-8GJ6i53cpfN8lymwb6tcRZm1DrCuUsUXscbbAWStKAcww/exec";

const REMAIN_TIME_TO_EDIT = 5;

let studentData = [];
let trainerData = [];

let studentCalendar = {};
let trainerCalendar = {};

let scheduleSheetData = [];

const dayOfCurrentWeek = [];

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
  console.log(" parseSchedule ~ result:", result);
  return result;
}

const getStudentCalendar = async () => {
  await fetch(`${SCHEDULE_API_URL}?type=get_calendar`, {
    redirect: "follow",
    method: "GET",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  })
    .then(async (response) => {
      const res = await response.json();
      if (res.success) {
        studentCalendar = parseSchedule(res.data);
      }
    })
    .catch((error) => {
      console.error("Lỗi khi lấy dữ liệu:", error);
    });
};

const getTrainerCalendar = async () => {
  await fetch(`${SCHEDULE_API_URL}?type=get_trainer_calendar`, {
    redirect: "follow",
    method: "GET",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  })
    .then(async (response) => {
      const res = await response.json();
      if (res.success) {
        trainerCalendar = parseSchedule(res.data);
      }
    })
    .catch((error) => {
      console.error("Lỗi khi lấy dữ liệu:", error);
    });
};

function generateSchedule(index, day) {
  const scheduleContainer = document.getElementById("modal-schedule");
  scheduleContainer.innerHTML = "";

  const leisureTime = studentData[index].times[day];

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
      console.log(" lines.forEach ~ match:", match);
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

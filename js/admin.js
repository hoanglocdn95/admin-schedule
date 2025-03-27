const ACCOUNT_API_URL =
  "https://script.google.com/macros/s/AKfycbwhrXjVvSpS05ehLyHYs971_uRZS-rIav8W0P6TqP3cs5rigd4E-bIKnbCN-ACFxtsYrQ/exec";

document.addEventListener("DOMContentLoaded", async function () {
  const emailField = document.getElementById("email");
  const storedEmail = sessionStorage.getItem("user_email");
  if (storedEmail) {
    emailField.value = storedEmail;
    await fetchTrainerData(storedEmail);
  }

  const form = document.getElementById("userInfoForm");
  const loadingOverlay = document.getElementById("loadingOverlay");

  form.addEventListener("submit", async function (event) {
    const userInStorage = JSON.parse(sessionStorage.getItem("user_info"));
    console.log(" userInStorage:", userInStorage);

    event.preventDefault();

    const userData = {
      type: "trainer_info",
      name: document.getElementById("name").value || "",
      email: document.getElementById("email").value,
      facebook: document.getElementById("facebook").value || "",
      timezone: document.getElementById("timezone").value || "",
    };

    if (compareObjects(userInStorage, userData)) {
      window.location.href = "calendar.html";
      return;
    }

    loadingOverlay.style.display = "flex";

    await fetch(ACCOUNT_API_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(userData),
    })
      .then((response) => {
        loadingOverlay.style.display = "none";
        M.toast({ html: "Thông tin đã được lưu!", classes: "green darken-1" });
        sessionStorage.setItem("user_info", JSON.stringify(userData));
        setTimeout(() => {
          window.location.href = "calendar.html";
        }, 1000);
      })
      .catch((error) => {
        console.error("Lỗi khi lưu dữ liệu:", error);
      });
  });
});

async function fetchTrainerData(email) {
  const loadingOverlay = document.getElementById("loadingOverlay");
  loadingOverlay.style.display = "flex";
  try {
    const response = await fetch(
      `${ACCOUNT_API_URL}?type=get_trainer&email=${email}`,
      {
        method: "GET",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      }
    );
    const data = await response.json();
    if (data.success && data.user) {
      const { name, pteExamDate, timezone, facebook } = data.user;

      if (pteExamDate) {
        const dateObj = new Date(pteExamDate);
        const formattedDate = dateObj.toISOString().split("T")[0];
        document.getElementById("pteExamDate").value = formattedDate;
      }

      if (name && timezone) {
        document.getElementById("goCalendar").style.display = "list-item";
        sessionStorage.setItem(
          "user_info",
          JSON.stringify({ ...data.user, type: "trainer_info" })
        );
      }

      document.getElementById("name").value = name || "";
      document.getElementById("facebook").value = facebook || "";
      document.getElementById("timezone").value = timezone || "";
    }
    loadingOverlay.style.display = "none";
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu:", error);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  if (!sessionStorage.getItem("user_email")) {
    window.location.href = "index.html";
  }
});

function logout() {
  sessionStorage.clear();
  window.location.href = "index.html";
}

function compareObjects(obj1, obj2) {
  if (!obj1 && obj2) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  const commonKeys = keys1.filter((key) => keys2.includes(key));

  return commonKeys.every((key) => {
    let val1 = obj1[key];
    let val2 = obj2[key];

    if (typeof val1 === "number" || typeof val2 === "number") {
      val1 = val1.toString().replace(".", ",");
      val2 = val2.toString().replace(".", ",");
    }

    return val1 === val2;
  });
}

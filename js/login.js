const ACCOUNT_API_URL =
  "https://script.google.com/macros/s/AKfycbwhrXjVvSpS05ehLyHYs971_uRZS-rIav8W0P6TqP3cs5rigd4E-bIKnbCN-ACFxtsYrQ/exec";

async function login() {
  const email = document.getElementById("emailInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();
  const userType = document.querySelector(
    'input[name="userType"]:checked'
  ).value;
  const loadingOverlay = document.getElementById("loadingOverlay");
  const redirectPage = {
    student: "user.html",
    trainer: "trainer.html",
  };

  if (email === "" || password === "") {
    M.toast({
      html: "Vui lòng nhập email và mật khẩu!",
      classes: "red",
      displayLength: 2000,
    });
    return;
  }

  loadingOverlay.style.display = "flex";

  try {
    const response = await fetch(ACCOUNT_API_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ type: "login", email, password, userType }),
    });

    const result = await response.json();
    const res = JSON.parse(result.message);
    const status = res.status;

    loadingOverlay.style.display = "none";

    switch (status) {
      case "wrong_password":
        M.toast({
          html: "Sai mật khẩu!",
          classes: "red",
          displayLength: 2000,
        });
        break;
      case "email_not_found":
        M.toast({
          html: "Email không tồn tại trong hệ thống",
          classes: "red",
          displayLength: 2000,
        });
        break;
      case "ok":
        M.toast({
          html: "Đăng nhập thành công!",
          classes: "green",
          displayLength: 2000,
        });
        sessionStorage.setItem("user_email", email);
        setTimeout(() => (window.location.href = redirectPage[userType]), 1000);
        break;
      default:
        M.toast({
          html: "Đã xảy ra lỗi, vui lòng thử lại",
          classes: "red",
          displayLength: 2000,
        });
    }
  } catch (error) {
    loadingOverlay.style.display = "none";
    M.toast({
      html: "Lỗi kết nối!",
      classes: "red",
      displayLength: 2000,
    });
    console.error("Lỗi:", error);
  }
}

function selectBtn(btn) {
  const siblings = btn.parentNode.querySelectorAll("button");
  siblings.forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}
document.querySelector(".submit-btn").addEventListener("click", function (e) {
  const realname = document.getElementById("realnameCheck").checked;

  if (!realname) {
    alert("실명 인증 체크는 필수입니다.");
    e.preventDefault();
  }
});

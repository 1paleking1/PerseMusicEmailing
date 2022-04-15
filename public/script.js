function pass_toggle() {
    var input = document.getElementById("adminPasswordinput");
    if (input.type === "password") {
      input.type = "text";
    } else {
      input.type = "password";
    }
}
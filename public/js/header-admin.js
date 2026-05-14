document.querySelectorAll(".painel-link").forEach(button => {
    button.addEventListener("click", () => {

        document.querySelectorAll(".painel-link").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".painel-content").forEach(c => c.classList.remove("active"));

        button.classList.add("active");

        const target = button.getAttribute("data-target");
        document.getElementById(target).classList.add("active");
    });
});
"use client";

export function ViewResultsLink() {
  return (
    <a
      href="#scenario-results"
      className="mt-3 inline-block text-sm underline underline-offset-2"
      onClick={(event) => {
        const section = document.getElementById("scenario-results");
        if (!section) {
          return;
        }
        event.preventDefault();
        section.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", "#scenario-results");
      }}
    >
      View results
    </a>
  );
}

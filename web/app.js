const briefs = document.querySelector("#briefs");

fetch("/api/briefs")
  .then((response) => response.json())
  .then((items) => {
    briefs.innerHTML = items
      .map(
        (item) => `
          <article class="brief">
            <h2>${item.name}</h2>
            <p>${item.summary}</p>
            <p><strong>Risk:</strong> ${item.riskBand} (${item.riskScore})</p>
            <p>${item.recommendation}</p>
          </article>
        `
      )
      .join("");
  });

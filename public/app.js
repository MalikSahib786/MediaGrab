const API_URL = "https://mediagrab.gmalikhusnainsahib.workers.dev/"; // Same domain for Pages + Functions

let currentPlatform = null;

function selectPlatform(platform) {
    currentPlatform = platform;

    document.querySelectorAll(".platform-btn").forEach(btn => {
        btn.classList.remove("active");
    });

    document
        .querySelector(`[data-platform="${platform}"]`)
        .classList.add("active");

    document.getElementById("platformHint").innerText =
        `Selected: ${platform}`;
}

async function download() {
    const url = document.getElementById("urlInput").value;

    if (!url) {
        alert("Paste a URL first");
        return;
    }

    document.getElementById("loading").classList.remove("hidden");
    document.getElementById("results").classList.add("hidden");
    document.getElementById("error").classList.add("hidden");

    try {
        const response = await fetch(
            `/api/download?url=${encodeURIComponent(url)}&platform=${currentPlatform}`
        );

        const data = await response.json();

        document.getElementById("loading").classList.add("hidden");

        if (data.error) {
            document.getElementById("error").classList.remove("hidden");
            document.getElementById("errorMessage").innerText = data.error;
            return;
        }

        let html = `
            <div class="bg-green-50 border border-green-200 rounded-xl p-6">
                <h2 class="text-xl font-bold mb-4">Success</h2>
        `;

        if (data.title) {
            html += `<p><strong>Title:</strong> ${data.title}</p>`;
        }

        if (data.media) {
            data.media.forEach(item => {
                html += `
                    <div class="mt-4">
                        <a href="${item.url}" target="_blank"
                           class="bg-blue-500 text-white px-4 py-2 rounded">
                           Download ${item.type}
                        </a>
                    </div>
                `;
            });
        }

        if (data.thumbnails) {
            Object.values(data.thumbnails).forEach(thumb => {
                html += `
                    <div class="mt-4">
                        <img src="${thumb.url}" class="w-64 rounded-lg mb-2">
                        <a href="${thumb.url}" target="_blank"
                           class="bg-purple-500 text-white px-4 py-2 rounded">
                           Download ${thumb.quality}
                        </a>
                    </div>
                `;
            });
        }

        html += `</div>`;

        const results = document.getElementById("results");
        results.innerHTML = html;
        results.classList.remove("hidden");

    } catch (err) {
        document.getElementById("loading").classList.add("hidden");
        document.getElementById("error").classList.remove("hidden");
        document.getElementById("errorMessage").innerText = err.message;
    }
}

function clearInput() {
    document.getElementById("urlInput").value = "";
}

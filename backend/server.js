import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Load secrets from environment when running locally
const {
  CPI_SRC_HOST,
  CPI_SRC_USER,
  CPI_SRC_PASS,
  CPI_SRC_TOKEN_URL,
  _GITHUB_PAT,
  _GITHUB_REPO,
} = process.env;

// Helper: Get OAuth token
async function getOAuthToken(tokenUrl, clientId, clientSecret) {
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const json = await res.json();
  return json.access_token;
}

// API 1 – List Artifacts
app.get("/artifacts", async (req, res) => {
  try {
    const token = await getOAuthToken(
      CPI_SRC_TOKEN_URL,
      CPI_SRC_USER,
      CPI_SRC_PASS
    );

    const url = `${CPI_SRC_HOST}/api/v1/IntegrationDesigntimeArtifacts`;
    const data = await fetch(url, {
      headers: { Authorization: "Bearer " + token },
    });

    const json = await data.json();
    const list = json.d.results.map((x) => x.Id);

    res.send(list);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// API 2 – Trigger GitHub workflow
app.post("/transport", async (req, res) => {
  try {
    const { artifacts, mode, rename } = req.body;

    const url = `https://api.github.com/repos/${_GITHUB_REPO}/actions/workflows/cpi-transport.yml/dispatches`;

    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${_GITHUB_PAT}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          artifacts: artifacts.join(","),
          mode: mode,
          rename: rename || "",
        },
      }),
    });

    res.send({ status: "ok", message: "Workflow triggered" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Backend running at http://localhost:3000");
});

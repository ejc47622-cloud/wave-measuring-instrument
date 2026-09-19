import { getStore } from "@netlify/blobs";

const MAX_BODY_LENGTH = 256_000;
const MAX_WAVEFORM_SAMPLES = 4_096;
const MAX_RESULTS = 100;
const KEY_PREFIX = "submissions/";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function cleanText(value) {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

function normalizeResult(value) {
  if (!value || typeof value !== "object") return null;

  const frequency = Number(value.frequency);
  const sampleRate = Number(value.sampleRate);
  if (
    !Number.isFinite(frequency) ||
    frequency <= 0 ||
    frequency > 10_000 ||
    !Number.isFinite(sampleRate) ||
    sampleRate < 4_000 ||
    sampleRate > 384_000 ||
    !Array.isArray(value.waveform)
  ) {
    return null;
  }

  const waveform = value.waveform
    .slice(0, MAX_WAVEFORM_SAMPLES)
    .map(Number)
    .filter(Number.isFinite);

  if (waveform.length < 2) return null;

  return {
    frequency: Math.round(frequency),
    sampleRate,
    waveform,
  };
}

function normalizeSubmission(value) {
  if (!value || typeof value !== "object") return null;

  const modes = ["strength", "pitch", "instrument"];
  const ranges = [10, 20, 40];
  const mode = modes.find((item) => item === value.mode);
  const range = ranges.find((item) => item === Number(value.range));
  const requestedGroupNumber = Number(value.groupNumber);
  const groupNumber =
    Number.isSafeInteger(requestedGroupNumber) &&
    requestedGroupNumber >= 1 &&
    requestedGroupNumber <= 99
      ? requestedGroupNumber
      : 0;
  const A = normalizeResult(value.A);
  const B = normalizeResult(value.B);

  if (!mode || !range || (!A && !B)) return null;

  return {
    mode,
    range,
    groupNumber,
    instrument: cleanText(value.instrument),
    instrumentA: cleanText(value.instrumentA),
    instrumentB: cleanText(value.instrumentB),
    A,
    B,
  };
}

function submissionIdFromKey(key) {
  const match = /^submissions\/(\d+)$/.exec(key);
  if (!match) return 0;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

function makeId() {
  const random = crypto.getRandomValues(new Uint16Array(1))[0] % 1000;
  return Date.now() * 1000 + random;
}

async function createSubmission(store, input) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = makeId();
    const sentAt = Date.now();
    const submission = { id: String(id), sentAt, ...input };
    const result = await store.setJSON(`${KEY_PREFIX}${id}`, submission, {
      onlyIfNew: true,
    });
    if (result.modified) return submission;
  }
  throw new Error("Could not create a unique submission ID.");
}

async function listSubmissions(store, afterId) {
  const { blobs } = await store.list({ prefix: KEY_PREFIX });
  const selected = blobs
    .map((blob) => ({ key: blob.key, id: submissionIdFromKey(blob.key) }))
    .filter((item) => item.id > afterId)
    .sort((a, b) => (afterId > 0 ? a.id - b.id : b.id - a.id))
    .slice(0, MAX_RESULTS);

  const submissions = await Promise.all(
    selected.map((item) => store.get(item.key, { type: "json" }))
  );

  return submissions.filter(Boolean);
}

export default async (request) => {
  const store = getStore({
    name: "activity1-wave-submissions",
    consistency: "strong",
  });

  if (request.method === "GET") {
    try {
      const after = Number(new URL(request.url).searchParams.get("after") || 0);
      const afterId = Number.isSafeInteger(after) && after > 0 ? after : 0;
      const submissions = await listSubmissions(store, afterId);
      return json({ submissions });
    } catch {
      return json({ error: "측정 결과를 불러오지 못했습니다." }, 500);
    }
  }

  if (request.method === "POST") {
    try {
      const declaredLength = Number(request.headers.get("content-length") || 0);
      if (declaredLength > MAX_BODY_LENGTH) {
        return json({ error: "전송 데이터가 너무 큽니다." }, 413);
      }

      const text = await request.text();
      if (text.length > MAX_BODY_LENGTH) {
        return json({ error: "전송 데이터가 너무 큽니다." }, 413);
      }

      const input = normalizeSubmission(JSON.parse(text));
      if (!input) {
        return json({ error: "측정 결과 형식이 올바르지 않습니다." }, 400);
      }

      const stored = await createSubmission(store, input);
      return json({ submission: stored }, 201);
    } catch {
      return json({ error: "측정 결과를 저장하지 못했습니다." }, 500);
    }
  }

  if (request.method === "DELETE") {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isSafeInteger(id) || id <= 0) {
      return json({ error: "삭제할 측정 결과가 올바르지 않습니다." }, 400);
    }

    try {
      const key = `${KEY_PREFIX}${id}`;
      const existing = await store.getMetadata(key);
      if (!existing) {
        return json({ error: "측정 결과를 찾을 수 없습니다." }, 404);
      }
      await store.delete(key);
      return json({ deleted: true, id: String(id) });
    } catch {
      return json({ error: "측정 결과를 삭제하지 못했습니다." }, 500);
    }
  }

  return json({ error: "지원하지 않는 요청입니다." }, 405);
};

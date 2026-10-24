#!/usr/bin/env node
/**
 * PHASE 2 / TASK P2.5 (ROUND 4) — Independent Requirement Text Audit & Snapshot Builder
 *
 * Pipeline:
 *   PDF CTGDPT (13o_7GOH_en10qIrlgLTyqrIlJSgCZxma)
 *     ↓
 *   tools/curriculum/source-transcripts/ctgdpt2018-tin6-yccd.source.json (Reviewed Source Transcript)
 *     ↓
 *   tools/curriculum/trusted-official-requirements-g6.json (Trusted Snapshot)
 *     ↓
 *   data/requirements/requirements-g6.json (Requirement Bank)
 *     ↓
 *   REQUIREMENT_TEXT_AUDIT.md & CurriculumValidator
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '../..');
const SOURCE_TRANSCRIPT_PATH = path.join(
  __dirname,
  'source-transcripts/ctgdpt2018-tin6-yccd.source.json'
);
const TRUSTED_SNAPSHOT_PATH = path.join(__dirname, 'trusted-official-requirements-g6.json');
const REQUIREMENTS_BANK_PATH = path.join(REPO_ROOT, 'data/requirements/requirements-g6.json');
const AUDIT_REPORT_PATH = path.join(REPO_ROOT, 'REQUIREMENT_TEXT_AUDIT.md');

function sha256Text(str) {
  return crypto
    .createHash('sha256')
    .update(String(str == null ? '' : str).trim(), 'utf8')
    .digest('hex');
}

/**
 * Pure normalization function allowed by policy:
 * "Whitespace/line-break/obvious OCR-spacing normalization only. No semantic rewriting."
 */
function applyAllowedNormalization(rawSourceText) {
  return String(rawSourceText == null ? '' : rawSourceText)
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b(\d+)(KB|MB|GB|TB)\b/g, '$1 $2')
    .trim();
}

function buildTrustedSnapshotFromTranscript(transcript) {
  const snapshot = {
    snapshotId: 'TRUSTED-CTGDPT2018-TIN6-SNAPSHOT-V4',
    sourceTranscriptId: transcript.transcriptId,
    sourceTranscriptPath: 'tools/curriculum/source-transcripts/ctgdpt2018-tin6-yccd.source.json',
    sourceId: transcript.sourceId,
    sourceDocumentDriveId: transcript.sourceDocumentDriveId,
    sourceOfficialUrl: transcript.sourceOfficialUrl,
    sourceSection: transcript.sourceSection,
    transcribedAt: transcript.transcribedAt,
    verifiedAt: transcript.verifiedAt,
    transcriptionPolicy: transcript.transcriptionPolicy,
    reviewStatus: transcript.reviewStatus,
    expectedTotalCount: 38,
    expectedTopicCounts: {
      'G6-A': 10,
      'G6-B': 4,
      'G6-C': 7,
      'G6-D': 5,
      'G6-E': 9,
      'G6-F': 3
    },
    requirements: {}
  };

  for (const item of transcript.items || []) {
    const normalized = applyAllowedNormalization(item.rawSourceText);
    if (normalized !== item.normalizedOfficialText) {
      throw new Error(
        `Source transcript item ${item.requirementId} failed allowed normalization check:\n` +
          `  applyAllowedNormalization(rawSourceText) = "${normalized}"\n` +
          `  item.normalizedOfficialText              = "${item.normalizedOfficialText}"`
      );
    }
    snapshot.requirements[item.requirementId] = {
      topicId: item.topicId,
      rawSourceText: item.rawSourceText,
      officialText: normalized,
      officialTextHash: sha256Text(normalized),
      normalizationApplied: item.normalizationApplied,
      sourceDocumentDriveId: transcript.sourceDocumentDriveId,
      sourceSection: transcript.sourceSection
    };
  }

  return snapshot;
}

function syncRequirementsFromTrustedSnapshot(snapshot) {
  const reqs = JSON.parse(fs.readFileSync(REQUIREMENTS_BANK_PATH, 'utf8'));
  const updated = reqs.map(r => {
    const trusted = snapshot.requirements[r.requirementId];
    if (!trusted) {
      throw new Error(`Requirement ${r.requirementId} not found in Trusted Snapshot`);
    }
    return {
      ...r,
      officialText: trusted.officialText,
      officialTextHash: trusted.officialTextHash,
      version: '2018.4'
    };
  });
  fs.writeFileSync(REQUIREMENTS_BANK_PATH, JSON.stringify(updated, null, 2) + '\n', 'utf8');
  return updated;
}

function generateAuditReport(transcript, requirements) {
  const reqById = new Map(requirements.map(r => [r.requirementId, r]));
  let matchCount = 0;
  let mismatchCount = 0;

  const lines = [
    '# BÁO CÁO ĐỐI CHIẾU NGUYÊN VĂN 38 YÊU CẦU CẦN ĐẠT LỚP 6 (`REQUIREMENT_TEXT_AUDIT.md`)',
    '',
    '- **Phase / Task:** `PHASE 2 / P2.5 FIX ROUND 4 ONLY`',
    '- **Nguồn PDF gốc:** Chương trình giáo dục phổ thông môn Tin học (Thông tư số 32/2018/TT-BGDĐT ngày 26/12/2018)',
    '- **Drive ID tài liệu gốc:** `13o_7GOH_en10qIrlgLTyqrIlJSgCZxma`',
    '- **VBPL URL:** `https://vbpl.vn/bogiaoducdaotao/Pages/vbpq-toanvan.aspx?ItemID=146721`',
    '- **File Source Transcript độc lập:** [tools/curriculum/source-transcripts/ctgdpt2018-tin6-yccd.source.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/source-transcripts/ctgdpt2018-tin6-yccd.source.json)',
    '- **File Trusted Snapshot:** [tools/curriculum/trusted-official-requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/trusted-official-requirements-g6.json)',
    '- **File Requirement Bank:** [data/requirements/requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/requirements/requirements-g6.json)',
    `- **Transcription Policy:** \`${transcript.transcriptionPolicy}\``,
    '',
    '---',
    '',
    '## Bảng đối chiếu `source transcript` vs `requirements-g6.json` (38 / 38)',
    '',
    '| RequirementID | SourceText (`rawSourceText` từ PDF CTGDPT) | StoredOfficialText (`requirements-g6.json`) | NormalizationApplied | ExactAfterAllowedNormalization |',
    '| :--- | :--- | :--- | :--- | :---: |'
  ];

  for (const item of transcript.items) {
    const stored = reqById.get(item.requirementId);
    const expectedNormalized = applyAllowedNormalization(item.rawSourceText);
    const actualStored = stored ? stored.officialText : '';
    const isExact =
      Boolean(stored) &&
      expectedNormalized === item.normalizedOfficialText &&
      actualStored === expectedNormalized;

    if (isExact) {
      matchCount++;
    } else {
      mismatchCount++;
    }

    const displayRaw = item.rawSourceText.replace(/\r?\n/g, ' ⏎ ');
    lines.push(
      `| \`${item.requirementId}\` | ${displayRaw} | ${actualStored} | ${item.normalizationApplied} | **${
        isExact ? 'TRUE' : 'FALSE'
      }** |`
    );
  }

  lines.push(
    '',
    '---',
    '',
    '## Tóm tắt kết quả Audit (Round 4)',
    '',
    `- **Tổng số Requirement kiểm định:** \`${transcript.items.length} / 38\``,
    `- **Số Requirement đạt \`ExactAfterAllowedNormalization = TRUE\`:** \`${matchCount} / 38\``,
    `- **Số Requirement sai lệch (\`FALSE\`):** \`${mismatchCount}\``,
    '- **5 câu `officialText` đã sửa chuẩn xác theo PDF gốc ở Round 4:**',
    '  1. `G6-A-09`: `"Nêu được tên và độ lớn (xấp xỉ theo hệ thập phân) của các đơn vị cơ bản đo dung lượng thông tin: Byte, KB, MB, GB, quy đổi được một cách gần đúng giữa các đơn vị đo lường này. Ví dụ: 1 KB bằng xấp xỉ 1 ngàn byte, 1 MB xấp xỉ 1 triệu byte, 1 GB xấp xỉ 1 tỉ byte."` *(chuẩn hóa `1KB → 1 KB`, giữ nguyên từ `"bằng"`)*',
    '  2. `G6-D-01`: `"Giới thiệu được sơ lược về một số tác hại và nguy cơ bị hại khi tham gia Internet. Nêu và thực hiện được một số biện pháp phòng ngừa cơ bản với sự hướng dẫn của giáo viên."` *(giữ nguyên từ `"về"` và dấu chấm câu `". Nêu"`)*',
    '  3. `G6-D-05`: `"Nhận diện được một số thông điệp (chẳng hạn email, yêu cầu kết bạn, lời mời tham gia câu lạc bộ,...) lừa đảo hoặc mang nội dung xấu."` *(giữ nguyên phần ví dụ trong ngoặc đơn)*',
    '  4. `G6-E-07`: `"Sắp xếp được một cách logic và trình bày được dưới dạng sơ đồ tư duy các ý tưởng, khái niệm."` *(giữ nguyên `"logic"`, không đổi thành `"lôgic"`)*',
    '  5. `G6-F-03`: `"Biết được chương trình là mô tả một thuật toán để máy tính “hiểu” và thực hiện được."` *(giữ nguyên dấu ngoặc kép quanh `“hiểu”`)*',
    ''
  );

  fs.writeFileSync(AUDIT_REPORT_PATH, lines.join('\n'), 'utf8');
  return { matchCount, mismatchCount, total: transcript.items.length };
}

function runAuditCli(options = {}) {
  const transcript = JSON.parse(fs.readFileSync(SOURCE_TRANSCRIPT_PATH, 'utf8'));
  const snapshot = buildTrustedSnapshotFromTranscript(transcript);
  fs.writeFileSync(TRUSTED_SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  if (options.syncRequirements) {
    syncRequirementsFromTrustedSnapshot(snapshot);
  }

  const requirements = JSON.parse(fs.readFileSync(REQUIREMENTS_BANK_PATH, 'utf8'));
  const result = generateAuditReport(transcript, requirements);

  if (result.mismatchCount > 0 || result.matchCount !== 38) {
    console.error(
      `❌ REQUIREMENT TEXT AUDIT FAILED: ${result.matchCount}/38 TRUE, ${result.mismatchCount} FALSE -> PHASE 2 = BLOCKED`
    );
    process.exit(1);
  }

  console.log(
    `✅ REQUIREMENT TEXT AUDIT PASSED: ${result.matchCount}/38 ExactAfterAllowedNormalization = TRUE`
  );
  return result;
}

if (require.main === module) {
  const syncRequirements = process.argv.includes('--sync-requirements');
  runAuditCli({ syncRequirements });
}

module.exports = {
  SOURCE_TRANSCRIPT_PATH,
  TRUSTED_SNAPSHOT_PATH,
  applyAllowedNormalization,
  buildTrustedSnapshotFromTranscript,
  generateAuditReport,
  runAuditCli
};

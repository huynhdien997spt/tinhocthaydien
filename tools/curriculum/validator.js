// tools/curriculum/validator.js
// Validator cho Data Foundation (Phase 2 / Task P2.5)
// Kiểm tra:
// 1. JSON Schema cho toàn bộ 12 thực thể: Source, Topic, Lesson, Requirement, Competency, NLSMapping, AICompetencyMapping, Activity, Question, Evidence, Resource, MasteryRule.
// 2. 10 Quy tắc nghiệp vụ bắt buộc (Mandatory Business & Integrity Rules):
//    - FAIL nếu ID trùng (DUPLICATE_ID)
//    - FAIL nếu foreign key / reference không tồn tại (DANGLING_REFERENCE)
//    - FAIL nếu published Lesson thiếu RequirementID (PUBLISHED_LESSON_MISSING_REQUIREMENT)
//    - FAIL nếu Question thiếu RequirementID (QUESTION_MISSING_REQUIREMENT)
//    - FAIL nếu Question thiếu correctAnswer (QUESTION_MISSING_CORRECT_ANSWER)
//    - FAIL nếu Question thiếu explanation (QUESTION_MISSING_EXPLANATION)
//    - FAIL nếu Activity không có requirementIds và cũng không có educationalPurposeApproved=true (ACTIVITY_UNAPPROVED_WITHOUT_REQUIREMENTS)
//    - FAIL nếu Resource cần URL (requiresUrl=true hoặc resourceType online) nhưng URL rỗng (RESOURCE_MISSING_URL)
//    - FAIL nếu AICompetencyMapping ở trạng thái published nhưng teacherApproved != true, hoặc nếu Requirement Bank bị chèn trái phép NL AI (UNAPPROVED_AI_MAPPING / UNAUTHORIZED_AI_IN_REQUIREMENT_BANK)
//    - FAIL nếu Requirement officialText bị thay đổi trái version/review (so khớp SHA-256 officialTextHash và baseline official registry) (OFFICIAL_REQUIREMENT_TEXT_TAMPERED)

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function sha256Text(str) {
  return crypto.createHash("sha256").update(String(str == null ? "" : str).trim(), "utf8").digest("hex");
}

/** Bộ kiểm tra JSON Schema nhẹ, không phụ thuộc thư viện ngoài */
function validateAgainstJsonSchema(item, schema, entityLabel, itemId) {
  const errors = [];
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    errors.push({ code: "SCHEMA_INVALID", entity: entityLabel, id: itemId || "", message: `${entityLabel} must be an object` });
    return errors;
  }

  const required = schema.required || [];
  for (const reqField of required) {
    if (item[reqField] === undefined || item[reqField] === null) {
      errors.push({
        code: "SCHEMA_MISSING_FIELD",
        entity: entityLabel,
        id: itemId || "",
        field: reqField,
        message: `${entityLabel} (${itemId}) is missing required field '${reqField}'`
      });
    }
  }

  const props = schema.properties || {};
  for (const [k, val] of Object.entries(item)) {
    if (schema.additionalProperties === false && !Object.prototype.hasOwnProperty.call(props, k)) {
      errors.push({
        code: "SCHEMA_ADDITIONAL_PROPERTY",
        entity: entityLabel,
        id: itemId || "",
        field: k,
        message: `${entityLabel} (${itemId}) has unknown property '${k}'`
      });
      continue;
    }
    const spec = props[k];
    if (!spec || val === undefined || val === null) continue;

    const allowedTypes = Array.isArray(spec.type) ? spec.type : (spec.type ? [spec.type] : []);
    if (allowedTypes.length > 0) {
      const actualType = Array.isArray(val) ? "array" : (typeof val === "number" && Number.isInteger(val) ? "integer" : typeof val);
      const typeOk = allowedTypes.some(t => t === actualType || (t === "number" && actualType === "integer"));
      if (!typeOk) {
        errors.push({
          code: "SCHEMA_TYPE_MISMATCH",
          entity: entityLabel,
          id: itemId || "",
          field: k,
          message: `${entityLabel} (${itemId}).${k} expected type ${allowedTypes.join("|")} but got ${actualType}`
        });
        continue;
      }
    }

    if (spec.const !== undefined && val !== spec.const) {
      errors.push({
        code: "SCHEMA_CONST_MISMATCH",
        entity: entityLabel,
        id: itemId || "",
        field: k,
        message: `${entityLabel} (${itemId}).${k} must equal '${spec.const}'`
      });
    }
    if (spec.enum && !spec.enum.includes(val)) {
      errors.push({
        code: "SCHEMA_ENUM_MISMATCH",
        entity: entityLabel,
        id: itemId || "",
        field: k,
        message: `${entityLabel} (${itemId}).${k} value '${val}' is not in [${spec.enum.join(", ")}]`
      });
    }
    if (typeof val === "string" && spec.pattern && !(new RegExp(spec.pattern).test(val))) {
      errors.push({
        code: "SCHEMA_PATTERN_MISMATCH",
        entity: entityLabel,
        id: itemId || "",
        field: k,
        message: `${entityLabel} (${itemId}).${k} value '${val}' does not match pattern ${spec.pattern}`
      });
    }
  }
  return errors;
}

class CurriculumValidator {
  constructor(opts = {}) {
    if (typeof opts === "string") {
      this.schemasDir = opts;
      this.officialRequirementBaseline = null;
    } else {
      this.schemasDir = opts.schemasDir || path.resolve(__dirname, "../../schemas");
      this.officialRequirementBaseline = opts.officialRequirementBaseline || null;
    }
    this.schemas = this._loadSchemas();
  }

  _loadSchemas() {
    const map = {};
    const files = [
      ["source", "source.schema.json"],
      ["topic", "topic.schema.json"],
      ["competency", "competency.schema.json"],
      ["requirement", "requirement.schema.json"],
      ["nlsMapping", "nls-mapping.schema.json"],
      ["aiMapping", "ai-competency-mapping.schema.json"],
      ["lesson", "lesson.schema.json"],
      ["activity", "activity.schema.json"],
      ["question", "question.schema.json"],
      ["evidence", "evidence.schema.json"],
      ["resource", "resource.schema.json"],
      ["masteryRule", "mastery-rule.schema.json"]
    ];
    for (const [key, fname] of files) {
      const p = path.join(this.schemasDir, fname);
      if (fs.existsSync(p)) {
        map[key] = JSON.parse(fs.readFileSync(p, "utf8"));
      }
    }
    return map;
  }

  /**
   * Kiểm tra toàn diện một bộ dữ liệu Curriculum Dataset.
   * @param {object} dataset
   * @returns {{ valid: boolean, errorCount: number, errors: Array, summary: object }}
   */
  validateDataset(dataset) {
    const errors = [];
    const sources = dataset.sources || [];
    const topics = dataset.topics || [];
    const competencies = dataset.competencies || [];
    const requirements = dataset.requirements || [];
    const nlsMappings = dataset.nlsMappings || [];
    const aiMappings = dataset.aiMappings || [];
    const lessons = dataset.lessons || [];
    const activities = dataset.activities || [];
    const questions = dataset.questions || [];
    const evidences = dataset.evidences || [];
    const resources = dataset.resources || [];
    const masteryRules = dataset.masteryRules || [];

    const idSets = {
      source: new Set(),
      topic: new Set(),
      competency: new Set(),
      competencyCode: new Set(),
      requirement: new Set(),
      nlsMapping: new Set(),
      aiMapping: new Set(),
      lesson: new Set(),
      activity: new Set(),
      question: new Set(),
      evidence: new Set(),
      resource: new Set(),
      masteryRule: new Set()
    };
    const globalSeenIds = new Map(); // global ID -> entityType

    const registerId = (entityType, id, setKey) => {
      if (!id) return;
      if (idSets[setKey].has(id) || globalSeenIds.has(id)) {
        errors.push({
          code: "DUPLICATE_ID",
          entity: entityType,
          id,
          message: `Duplicate ID '${id}' detected in ${entityType}`
        });
      }
      idSets[setKey].add(id);
      globalSeenIds.set(id, entityType);
    };

    // 1. Validate Sources
    for (const s of sources) {
      registerId("Source", s.sourceId, "source");
      if (this.schemas.source) errors.push(...validateAgainstJsonSchema(s, this.schemas.source, "Source", s.sourceId));
    }

    // 2. Validate Topics
    for (const t of topics) {
      registerId("Topic", t.topicId, "topic");
      if (this.schemas.topic) errors.push(...validateAgainstJsonSchema(t, this.schemas.topic, "Topic", t.topicId));
      if (t.sourceId && !idSets.source.has(t.sourceId)) {
        errors.push({
          code: "DANGLING_REFERENCE",
          entity: "Topic",
          id: t.topicId,
          field: "sourceId",
          targetId: t.sourceId,
          message: `Topic '${t.topicId}' references non-existent sourceId '${t.sourceId}'`
        });
      }
    }

    // 3. Validate Competencies
    for (const c of competencies) {
      registerId("Competency", c.competencyId, "competency");
      if (c.code) idSets.competencyCode.add(c.code);
      if (this.schemas.competency) errors.push(...validateAgainstJsonSchema(c, this.schemas.competency, "Competency", c.competencyId));
      if (c.sourceId && !idSets.source.has(c.sourceId)) {
        errors.push({
          code: "DANGLING_REFERENCE",
          entity: "Competency",
          id: c.competencyId,
          field: "sourceId",
          targetId: c.sourceId,
          message: `Competency '${c.competencyId}' references non-existent sourceId '${c.sourceId}'`
        });
      }
    }

    // 4. Validate Requirements (including AI injection prohibition & officialText integrity)
    for (const r of requirements) {
      registerId("Requirement", r.requirementId, "requirement");

      // Rule #4: Không tự thêm NL AI vào Requirement Bank
      const hasAiComp = Array.isArray(r.competencyIds) && r.competencyIds.some(cid => /^AI|NL[_-]?AI/i.test(String(cid)));
      if (hasAiComp) {
        errors.push({
          code: "UNAUTHORIZED_AI_IN_REQUIREMENT_BANK",
          entity: "Requirement",
          id: r.requirementId,
          message: `Requirement '${r.requirementId}' must not directly embed AI competency in Requirement Bank`
        });
      }

      if (this.schemas.requirement) errors.push(...validateAgainstJsonSchema(r, this.schemas.requirement, "Requirement", r.requirementId));

      // Rule #5.10: Requirement officialText bị thay đổi trái version/review
      const computedHash = sha256Text(r.officialText);
      if (!r.officialTextHash || r.officialTextHash !== computedHash || r.reviewStatus !== "approved_official") {
        errors.push({
          code: "OFFICIAL_REQUIREMENT_TEXT_TAMPERED",
          entity: "Requirement",
          id: r.requirementId,
          message: `Requirement '${r.requirementId}' officialText was modified without matching version/review approval hash`
        });
      } else if (this.officialRequirementBaseline && this.officialRequirementBaseline[r.requirementId]) {
        const base = this.officialRequirementBaseline[r.requirementId];
        if (base.officialText !== r.officialText && base.version === r.version) {
          errors.push({
            code: "OFFICIAL_REQUIREMENT_TEXT_TAMPERED",
            entity: "Requirement",
            id: r.requirementId,
            message: `Requirement '${r.requirementId}' officialText differs from official baseline without version bump & review`
          });
        }
      }

      if (r.topicId && !idSets.topic.has(r.topicId)) {
        errors.push({
          code: "DANGLING_REFERENCE",
          entity: "Requirement",
          id: r.requirementId,
          field: "topicId",
          targetId: r.topicId,
          message: `Requirement '${r.requirementId}' references non-existent topicId '${r.topicId}'`
        });
      }
      if (r.sourceId && !idSets.source.has(r.sourceId)) {
        errors.push({
          code: "DANGLING_REFERENCE",
          entity: "Requirement",
          id: r.requirementId,
          field: "sourceId",
          targetId: r.sourceId,
          message: `Requirement '${r.requirementId}' references non-existent sourceId '${r.sourceId}'`
        });
      }
      for (const cid of r.competencyIds || []) {
        if (!idSets.competency.has(cid)) {
          errors.push({
            code: "DANGLING_REFERENCE",
            entity: "Requirement",
            id: r.requirementId,
            field: "competencyIds",
            targetId: cid,
            message: `Requirement '${r.requirementId}' references non-existent competencyId '${cid}'`
          });
        }
      }
    }

    // 5. Register IDs for child entities first so cross-references from Lesson can be validated
    for (const a of activities) registerId("Activity", a.activityId, "activity");
    for (const q of questions) registerId("Question", q.questionId, "question");
    for (const ev of evidences) registerId("Evidence", ev.evidenceId, "evidence");
    for (const res of resources) registerId("Resource", res.resourceId, "resource");
    for (const mr of masteryRules) registerId("MasteryRule", mr.masteryRuleId, "masteryRule");

    // 6. Validate Lessons
    for (const l of lessons) {
      registerId("Lesson", l.lessonId, "lesson");
      if (this.schemas.lesson) errors.push(...validateAgainstJsonSchema(l, this.schemas.lesson, "Lesson", l.lessonId));

      // Rule #5.3: FAIL nếu published Lesson thiếu RequirementID
      if (l.status === "published" && (!Array.isArray(l.requirementIds) || l.requirementIds.length === 0)) {
        errors.push({
          code: "PUBLISHED_LESSON_MISSING_REQUIREMENT",
          entity: "Lesson",
          id: l.lessonId,
          message: `Published lesson '${l.lessonId}' must have at least one RequirementID`
        });
      }

      if (l.topicId && !idSets.topic.has(l.topicId)) {
        errors.push({
          code: "DANGLING_REFERENCE",
          entity: "Lesson",
          id: l.lessonId,
          field: "topicId",
          targetId: l.topicId,
          message: `Lesson '${l.lessonId}' references non-existent topicId '${l.topicId}'`
        });
      }
      if (l.sourceId && !idSets.source.has(l.sourceId)) {
        errors.push({
          code: "DANGLING_REFERENCE",
          entity: "Lesson",
          id: l.lessonId,
          field: "sourceId",
          targetId: l.sourceId,
          message: `Lesson '${l.lessonId}' references non-existent sourceId '${l.sourceId}'`
        });
      }
      for (const reqId of l.requirementIds || []) {
        if (!idSets.requirement.has(reqId)) {
          errors.push({
            code: "DANGLING_REFERENCE",
            entity: "Lesson",
            id: l.lessonId,
            field: "requirementIds",
            targetId: reqId,
            message: `Lesson '${l.lessonId}' references non-existent requirementId '${reqId}'`
          });
        }
      }
      for (const cid of l.competencyIds || []) {
        if (!idSets.competency.has(cid)) {
          errors.push({
            code: "DANGLING_REFERENCE",
            entity: "Lesson",
            id: l.lessonId,
            field: "competencyIds",
            targetId: cid,
            message: `Lesson '${l.lessonId}' references non-existent competencyId '${cid}'`
          });
        }
      }
      for (const nls of l.nlsCodes || []) {
        if (!idSets.competencyCode.has(nls)) {
          errors.push({
            code: "DANGLING_REFERENCE",
            entity: "Lesson",
            id: l.lessonId,
            field: "nlsCodes",
            targetId: nls,
            message: `Lesson '${l.lessonId}' references non-existent NLS code '${nls}'`
          });
        }
      }
      for (const aid of l.activityIds || []) {
        if (!idSets.activity.has(aid)) {
          errors.push({
            code: "DANGLING_REFERENCE",
            entity: "Lesson",
            id: l.lessonId,
            field: "activityIds",
            targetId: aid,
            message: `Lesson '${l.lessonId}' references non-existent activityId '${aid}'`
          });
        }
      }
      for (const qid of l.questionIds || []) {
        if (!idSets.question.has(qid)) {
          errors.push({
            code: "DANGLING_REFERENCE",
            entity: "Lesson",
            id: l.lessonId,
            field: "questionIds",
            targetId: qid,
            message: `Lesson '${l.lessonId}' references non-existent questionId '${qid}'`
          });
        }
      }
      for (const eid of l.evidenceIds || []) {
        if (!idSets.evidence.has(eid)) {
          errors.push({
            code: "DANGLING_REFERENCE",
            entity: "Lesson",
            id: l.lessonId,
            field: "evidenceIds",
            targetId: eid,
            message: `Lesson '${l.lessonId}' references non-existent evidenceId '${eid}'`
          });
        }
      }
      for (const rid of l.resourceIds || []) {
        if (!idSets.resource.has(rid)) {
          errors.push({
            code: "DANGLING_REFERENCE",
            entity: "Lesson",
            id: l.lessonId,
            field: "resourceIds",
            targetId: rid,
            message: `Lesson '${l.lessonId}' references non-existent resourceId '${rid}'`
          });
        }
      }
      if (l.masteryRuleId && !idSets.masteryRule.has(l.masteryRuleId)) {
        errors.push({
          code: "DANGLING_REFERENCE",
          entity: "Lesson",
          id: l.lessonId,
          field: "masteryRuleId",
          targetId: l.masteryRuleId,
          message: `Lesson '${l.lessonId}' references non-existent masteryRuleId '${l.masteryRuleId}'`
        });
      }
    }

    // Also verify Requirement.lessonIds references
    for (const r of requirements) {
      for (const lid of r.lessonIds || []) {
        if (!idSets.lesson.has(lid)) {
          errors.push({
            code: "DANGLING_REFERENCE",
            entity: "Requirement",
            id: r.requirementId,
            field: "lessonIds",
            targetId: lid,
            message: `Requirement '${r.requirementId}' references non-existent lessonId '${lid}'`
          });
        }
      }
    }

    // 7. Validate NLS Mappings
    for (const m of nlsMappings) {
      registerId("NLSMapping", m.mappingId, "nlsMapping");
      if (this.schemas.nlsMapping) errors.push(...validateAgainstJsonSchema(m, this.schemas.nlsMapping, "NLSMapping", m.mappingId));
      if (m.lessonId && !idSets.lesson.has(m.lessonId)) {
        errors.push({
          code: "DANGLING_REFERENCE",
          entity: "NLSMapping",
          id: m.mappingId,
          field: "lessonId",
          targetId: m.lessonId,
          message: `NLSMapping '${m.mappingId}' references non-existent lessonId '${m.lessonId}'`
        });
      }
      if (m.competencyId && !idSets.competency.has(m.competencyId)) {
        errors.push({
          code: "DANGLING_REFERENCE",
          entity: "NLSMapping",
          id: m.mappingId,
          field: "competencyId",
          targetId: m.competencyId,
          message: `NLSMapping '${m.mappingId}' references non-existent competencyId '${m.competencyId}'`
        });
      }
      for (const reqId of m.requirementIds || []) {
        if (!idSets.requirement.has(reqId)) {
          errors.push({
            code: "DANGLING_REFERENCE",
            entity: "NLSMapping",
            id: m.mappingId,
            field: "requirementIds",
            targetId: reqId,
            message: `NLSMapping '${m.mappingId}' references non-existent requirementId '${reqId}'`
          });
        }
      }
    }

    // 8. Validate AI Competency Mappings (Rule #4 & #5.9: published AI mapping MUST have teacherApproved === true)
    for (const ai of aiMappings) {
      registerId("AICompetencyMapping", ai.aiMappingId, "aiMapping");
      if (this.schemas.aiMapping) errors.push(...validateAgainstJsonSchema(ai, this.schemas.aiMapping, "AICompetencyMapping", ai.aiMappingId));
      if (ai.status === "published" && ai.teacherApproved !== true) {
        errors.push({
          code: "UNAPPROVED_AI_MAPPING",
          entity: "AICompetencyMapping",
          id: ai.aiMappingId,
          message: `AICompetencyMapping '${ai.aiMappingId}' is published but teacherApproved is not true`
        });
      }
      if (ai.lessonId && !idSets.lesson.has(ai.lessonId)) {
        errors.push({
          code: "DANGLING_REFERENCE",
          entity: "AICompetencyMapping",
          id: ai.aiMappingId,
          field: "lessonId",
          targetId: ai.lessonId,
          message: `AICompetencyMapping '${ai.aiMappingId}' references non-existent lessonId '${ai.lessonId}'`
        });
      }
      for (const reqId of ai.requirementIds || []) {
        if (!idSets.requirement.has(reqId)) {
          errors.push({
            code: "DANGLING_REFERENCE",
            entity: "AICompetencyMapping",
            id: ai.aiMappingId,
            field: "requirementIds",
            targetId: reqId,
            message: `AICompetencyMapping '${ai.aiMappingId}' references non-existent requirementId '${reqId}'`
          });
        }
      }
    }

    // 9. Validate Activities (Rule #5.7: Activity không có requirementIds và cũng không có educationalPurposeApproved=true -> FAIL)
    for (const a of activities) {
      if (this.schemas.activity) errors.push(...validateAgainstJsonSchema(a, this.schemas.activity, "Activity", a.activityId));
      const hasReqs = Array.isArray(a.requirementIds) && a.requirementIds.length > 0;
      if (!hasReqs && a.educationalPurposeApproved !== true) {
        errors.push({
          code: "ACTIVITY_UNAPPROVED_WITHOUT_REQUIREMENTS",
          entity: "Activity",
          id: a.activityId,
          message: `Activity '${a.activityId}' has empty requirementIds and educationalPurposeApproved !== true`
        });
      }
      if (a.lessonId && !idSets.lesson.has(a.lessonId)) {
        errors.push({
          code: "DANGLING_REFERENCE",
          entity: "Activity",
          id: a.activityId,
          field: "lessonId",
          targetId: a.lessonId,
          message: `Activity '${a.activityId}' references non-existent lessonId '${a.lessonId}'`
        });
      }
      for (const reqId of a.requirementIds || []) {
        if (!idSets.requirement.has(reqId)) {
          errors.push({
            code: "DANGLING_REFERENCE",
            entity: "Activity",
            id: a.activityId,
            field: "requirementIds",
            targetId: reqId,
            message: `Activity '${a.activityId}' references non-existent requirementId '${reqId}'`
          });
        }
      }
    }

    // 10. Validate Questions (Rule #5.4, #5.5, #5.6: thiếu RequirementID, thiếu correctAnswer, thiếu explanation -> FAIL)
    for (const q of questions) {
      if (this.schemas.question) errors.push(...validateAgainstJsonSchema(q, this.schemas.question, "Question", q.questionId));
      if (!Array.isArray(q.requirementIds) || q.requirementIds.length === 0) {
        errors.push({
          code: "QUESTION_MISSING_REQUIREMENT",
          entity: "Question",
          id: q.questionId,
          message: `Question '${q.questionId}' must reference at least one RequirementID`
        });
      }
      const hasCorrect = Array.isArray(q.correctAnswer)
        ? q.correctAnswer.length > 0
        : typeof q.correctAnswer === "string" && q.correctAnswer.trim().length > 0;
      if (!hasCorrect) {
        errors.push({
          code: "QUESTION_MISSING_CORRECT_ANSWER",
          entity: "Question",
          id: q.questionId,
          message: `Question '${q.questionId}' is missing a non-empty correctAnswer`
        });
      }
      if (typeof q.explanation !== "string" || q.explanation.trim().length === 0) {
        errors.push({
          code: "QUESTION_MISSING_EXPLANATION",
          entity: "Question",
          id: q.questionId,
          message: `Question '${q.questionId}' is missing a non-empty explanation`
        });
      }
      if (q.lessonId && !idSets.lesson.has(q.lessonId)) {
        errors.push({
          code: "DANGLING_REFERENCE",
          entity: "Question",
          id: q.questionId,
          field: "lessonId",
          targetId: q.lessonId,
          message: `Question '${q.questionId}' references non-existent lessonId '${q.lessonId}'`
        });
      }
      if (q.activityId && !idSets.activity.has(q.activityId)) {
        errors.push({
          code: "DANGLING_REFERENCE",
          entity: "Question",
          id: q.questionId,
          field: "activityId",
          targetId: q.activityId,
          message: `Question '${q.questionId}' references non-existent activityId '${q.activityId}'`
        });
      }
      for (const reqId of q.requirementIds || []) {
        if (!idSets.requirement.has(reqId)) {
          errors.push({
            code: "DANGLING_REFERENCE",
            entity: "Question",
            id: q.questionId,
            field: "requirementIds",
            targetId: reqId,
            message: `Question '${q.questionId}' references non-existent requirementId '${reqId}'`
          });
        }
      }
    }

    // 11. Validate Evidences
    for (const ev of evidences) {
      if (this.schemas.evidence) errors.push(...validateAgainstJsonSchema(ev, this.schemas.evidence, "Evidence", ev.evidenceId));
      if (ev.lessonId && !idSets.lesson.has(ev.lessonId)) {
        errors.push({
          code: "DANGLING_REFERENCE",
          entity: "Evidence",
          id: ev.evidenceId,
          field: "lessonId",
          targetId: ev.lessonId,
          message: `Evidence '${ev.evidenceId}' references non-existent lessonId '${ev.lessonId}'`
        });
      }
      if (ev.activityId && !idSets.activity.has(ev.activityId)) {
        errors.push({
          code: "DANGLING_REFERENCE",
          entity: "Evidence",
          id: ev.evidenceId,
          field: "activityId",
          targetId: ev.activityId,
          message: `Evidence '${ev.evidenceId}' references non-existent activityId '${ev.activityId}'`
        });
      }
      for (const reqId of ev.requirementIds || []) {
        if (!idSets.requirement.has(reqId)) {
          errors.push({
            code: "DANGLING_REFERENCE",
            entity: "Evidence",
            id: ev.evidenceId,
            field: "requirementIds",
            targetId: reqId,
            message: `Evidence '${ev.evidenceId}' references non-existent requirementId '${reqId}'`
          });
        }
      }
    }

    // 12. Validate Resources (Rule #5.8: Resource cần URL nhưng URL rỗng -> FAIL)
    for (const res of resources) {
      if (this.schemas.resource) errors.push(...validateAgainstJsonSchema(res, this.schemas.resource, "Resource", res.resourceId));
      const needsUrl = res.requiresUrl === true || ["interactive_lesson", "simulation", "video", "reference_doc"].includes(res.resourceType);
      if (needsUrl && (typeof res.url !== "string" || res.url.trim().length === 0)) {
        errors.push({
          code: "RESOURCE_MISSING_URL",
          entity: "Resource",
          id: res.resourceId,
          message: `Resource '${res.resourceId}' requires a URL but url is empty`
        });
      }
      if (res.lessonId && !idSets.lesson.has(res.lessonId)) {
        errors.push({
          code: "DANGLING_REFERENCE",
          entity: "Resource",
          id: res.resourceId,
          field: "lessonId",
          targetId: res.lessonId,
          message: `Resource '${res.resourceId}' references non-existent lessonId '${res.lessonId}'`
        });
      }
      if (res.sourceId && !idSets.source.has(res.sourceId)) {
        errors.push({
          code: "DANGLING_REFERENCE",
          entity: "Resource",
          id: res.resourceId,
          field: "sourceId",
          targetId: res.sourceId,
          message: `Resource '${res.resourceId}' references non-existent sourceId '${res.sourceId}'`
        });
      }
    }

    // 13. Validate MasteryRules
    for (const mr of masteryRules) {
      if (this.schemas.masteryRule) errors.push(...validateAgainstJsonSchema(mr, this.schemas.masteryRule, "MasteryRule", mr.masteryRuleId));
      if (mr.lessonId && !idSets.lesson.has(mr.lessonId)) {
        errors.push({
          code: "DANGLING_REFERENCE",
          entity: "MasteryRule",
          id: mr.masteryRuleId,
          field: "lessonId",
          targetId: mr.lessonId,
          message: `MasteryRule '${mr.masteryRuleId}' references non-existent lessonId '${mr.lessonId}'`
        });
      }
      for (const aid of mr.requiredActivityIds || []) {
        if (!idSets.activity.has(aid)) {
          errors.push({
            code: "DANGLING_REFERENCE",
            entity: "MasteryRule",
            id: mr.masteryRuleId,
            field: "requiredActivityIds",
            targetId: aid,
            message: `MasteryRule '${mr.masteryRuleId}' references non-existent activityId '${aid}'`
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errorCount: errors.length,
      errors,
      summary: {
        sources: sources.length,
        topics: topics.length,
        competencies: competencies.length,
        requirements: requirements.length,
        nlsMappings: nlsMappings.length,
        aiMappings: aiMappings.length,
        lessons: lessons.length,
        activities: activities.length,
        questions: questions.length,
        evidences: evidences.length,
        resources: resources.length,
        masteryRules: masteryRules.length
      }
    };
  }
}

module.exports = {
  CurriculumValidator,
  sha256Text,
  computeOfficialTextHash: sha256Text
};

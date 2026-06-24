# R11 — Model & Effort Routing Framework (v1.0)

## Title

Model & Effort Routing Framework

## Summary

มาตรฐานการเลือก Model Tier และ Effort Level สำหรับระบบ Multi-Agent

กำหนดวิธีเลือก

- โมเดลที่เหมาะสม
- ระดับการคิดที่เหมาะสม
- การแบ่งงานระหว่าง Agent
- การ Escalation
- การ Delegation

เพื่อให้ระบบสามารถใช้ทรัพยากรอย่างมีประสิทธิภาพ โดยยังคงรักษาคุณภาพผลลัพธ์ตามระดับความซับซ้อนของงาน

---

## Purpose

ป้องกันปัญหา

### Under-Engineering

ใช้โมเดลเล็กเกินไปกับงานที่ซับซ้อน

ส่งผลให้

- วิเคราะห์ผิด
- สรุปผิด
- ตัดสินใจผิด

---

### Over-Engineering

ใช้โมเดลใหญ่เกินความจำเป็น

ส่งผลให้

- latency สูง
- cost สูง
- throughput ต่ำ
- context waste

---

## Core Principle

> Use the smallest capable model.
>
> Use the lowest sufficient effort.

---

โมเดลที่ใหญ่กว่า

≠

ผลลัพธ์ที่ดีกว่าเสมอไป

---

ระดับการคิดที่สูงกว่า

≠

จำเป็นกับทุกงาน

---

## Two-Dimensional Routing

ระบบต้องตัดสินใจสองมิติแยกจากกัน

### Dimension A

Model Selection

เลือกผู้ปฏิบัติงาน

---

### Dimension B

Effort Selection

เลือกระดับการคิด

---

ห้ามผูกสองมิติเข้าด้วยกัน

---

ตัวอย่าง

งานเดียวกัน

อาจใช้

Haiku + Medium

หรือ

Opus + Low

ได้

ขึ้นอยู่กับลักษณะงาน

---

# Model Tier

## T1 — Haiku 4.5

Role

Worker

Characteristics

- Fast
- Cheap
- High throughput
- Suitable for atomic tasks

Typical Usage

- Search
- Retrieval
- Extraction
- Classification
- Formatting
- Metadata scan
- File inspection

Primary Objective

Collect information

---

## T2 — Sonnet 4.6

Role

Analyst

Characteristics

- Strong reasoning
- Good synthesis
- Moderate cost

Typical Usage

- Analysis
- Comparison
- Requirement extraction
- Report generation
- Knowledge synthesis

Primary Objective

Understand information

---

## T3A — Opus 4.6

Role

Architect

Characteristics

- Advanced reasoning
- Multi-domain synthesis

Typical Usage

- Architecture
- Framework design
- System planning

Primary Objective

Make decisions

---

## T3B — Opus 4.7

Role

Senior Architect

Characteristics

- Deep synthesis
- Long-context reasoning

Context Window

1M

Typical Usage

- Large architecture review
- Complex planning
- Cross-domain integration

---

## T3C — Opus 4.8

Role

Principal Architect

Characteristics

- Maximum reasoning capability
- Highest ambiguity tolerance

Context Window

1M

Typical Usage

- Strategic design
- Governance design
- Critical decisions
- Multi-system architecture

---

## T4 — Opus 4.8 + Ultracode

Role

Builder

Characteristics

- Architecture + Implementation
- Autonomous execution

Typical Usage

- Code generation
- Refactoring
- Migration
- Multi-file implementation
- Code audit

Primary Objective

Build systems

---

# Effort Tier

## E0 — Low

Minimal reasoning

Use for

- Retrieval
- Classification
- Lookup
- Formatting

---

## E1 — Medium

Basic analysis

Use for

- Summaries
- Simple comparisons
- Requirement extraction

---

## E2 — High

Deep analysis

Use for

- Research
- Multi-document analysis
- Design review

---

## E3 — Extra

Advanced reasoning

Use for

- Architecture review
- Framework design
- Conflict resolution

---

## E4 — Max

Maximum reasoning depth

Use for

- Strategic decisions
- Governance
- Critical system design

---

## E5 — Ultracode

Implementation-focused reasoning

Use for

- Coding
- Refactoring
- Migration
- Validation

---

# Delegation Rule

Higher tiers must delegate downward whenever possible.

Allowed

T4 → T3

T4 → T2

T4 → T1

T3 → T2

T3 → T1

T2 → T1

---

Forbidden

T1 → T2

T1 → T3

T1 → T4

T2 → T3

T2 → T4

---

Workers do not request Architects.

Escalation is controlled by the Router.

---

# Task Decomposition Rule

Every task must be decomposed before execution.

Minimum decomposition stages

1. Retrieval
2. Analysis
3. Synthesis
4. Decision
5. Implementation

---

Each stage may use different models.

---

Example

User Request

Analyze 500 documents and design a taxonomy.

Execution

Retrieval
→ Haiku

Extraction
→ Haiku

Clustering
→ Sonnet

Taxonomy Design
→ Opus

Validation
→ Opus

---

# Retrieval Rule

Large models should not be used as retrievers.

---

Incorrect

Load 500 documents into Opus.

---

Correct

Documents

↓

Haiku Extraction

↓

Structured Findings

↓

Sonnet Analysis

↓

Opus Decision

---

Context capacity must not be used as an excuse to skip preprocessing.

---

# Escalation Rule

Escalation occurs only when necessary.

Valid reasons

- Ambiguity
- Contradiction
- Missing information
- Cross-domain synthesis
- Architectural impact

Invalid reasons

- Large context alone
- Convenience
- Default behavior

---

Escalation path

T1

↓

T2

↓

T3A

↓

T3B

↓

T3C

↓

T4

---

# Ultracode Activation Rule

Ultracode is an execution mode.

It is not a default mode.

Activate only when

- Writing code
- Modifying code
- Refactoring
- Migration
- Implementation planning
- Automated development workflows

Do not activate for

- Search
- Summaries
- Retrieval
- Classification
- Simple Q&A

---

# Router Decision Matrix

| Task Type | Default Route |
|------------|------------|
| Search | T1 + E0 |
| Retrieval | T1 + E0 |
| Classification | T1 + E0 |
| Extraction | T1 + E0 |
| Summarization | T1 + E1 |
| Analysis | T2 + E1 |
| Comparison | T2 + E1 |
| Research | T2 + E2 |
| Report Writing | T2 + E2 |
| Architecture Review | T3A + E3 |
| Framework Design | T3B + E3 |
| Governance Design | T3C + E4 |
| Strategic Planning | T3C + E4 |
| Coding | T4 + E5 |
| Refactoring | T4 + E5 |
| Migration | T4 + E5 |

---

# Golden Rule

Haiku gathers.

Sonnet understands.

Opus decides.

Ultracode builds.

---

# Routing Formula

Task Complexity

×

Reasoning Depth

×

Implementation Requirement

=

Routing Decision

---

The Router must optimize for

1. Correctness
2. Reliability
3. Cost
4. Latency

in that order.
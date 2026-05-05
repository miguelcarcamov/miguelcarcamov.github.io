---
title: "Syllabus — Distributed and Parallel Systems (1/2026) | Miguel Cárcamo"
syllabus_title: "Distributed and Parallel Systems"
description: "Syllabus — Distributed and Parallel Systems, first semester 2026, USACH."
semester: "First semester · 2026"
role: "Universidad de Santiago de Chile · Assistant Professor"
back_label: "← Back to Teaching"

---

<div class="syllabus-meta" markdown="0">
  <p><span class="syllabus-meta-label">Official channel</span> <strong>Google Classroom.</strong> Enrollment link (or join code) will be shared at the start of the semester. Day-to-day announcements and materials live there unless stated otherwise.</p>
  <p><span class="syllabus-meta-label">Instructor</span> Miguel Cárcamo — <a href="mailto:miguel.carcamo@usach.cl">miguel.carcamo@usach.cl</a></p>
</div>

<div class="syllabus-schedule" markdown="0">
  <div>
    <p class="syllabus-schedule-label">Lecture hours</p>
    <ul>
      <li>Monday, block L4 — 13:45–15:05</li>
      <li>Friday, block V5 — 15:20–16:40</li>
    </ul>
  </div>
  <div>
    <p class="syllabus-schedule-label">Laboratory</p>
    <ul>
      <li>Friday, block V6 — 16:55–18:15</li>
    </ul>
  </div>
</div>

## Course description

This course covers the foundations and applications of parallel and distributed systems. During the **first half** of the semester, the emphasis is on **parallel systems**; the **second half** focuses on **distributed systems**. Students will learn architectures, algorithms, and models relevant to both.

## Contents

### 1. Parallel systems

1. **Course introduction** — scalar vs. multicore processors; parallel architectures; modern processors; supercomputers.
2. **Synchronization and mutual exclusion** — race conditions; mutual exclusion; hardware and software solutions.
3. **Multithreaded parallelism on multiprocessors** — OpenMP; memory model; structured parallelism; tasks and unstructured parallelism.
4. **Object-oriented parallelism** — concurrency vs. parallelism; uC++; uC++ objects.
5. **Computational performance** — runtime and speedup; Amdahl’s and Gustafson’s laws; scalability.
6. **Parallelism in distributed systems** — message-passing; point-to-point and collective communication; topologies.

### 2. Distributed systems

1. **Introduction** — fundamental concepts; design goals (scalability, transparency, reliability).
2. **Peer-to-peer computing** — architectures; examples (BitTorrent, Kademlia).
3. **Edge and cloud computing** — introduction; comparing approaches.
4. **Virtualization and containers** — VMs vs. containers; Docker and Kubernetes in practice.
5. **Communication** — RPC, publish–subscribe; scalability of distributed communication.
6. **Blockchain and distributed consensus** — introduction; Paxos, Raft.

## Evaluation

### Theory

#### Quizzes

| Quiz | Date |
|------|------|
| Quiz 1 | Mon May 25, 2026 (before PEP1) |
| Quiz 2 | Fri Jun 26, 2026 (before PEP2) |

<div class="syllabus-note" markdown="1">
- Quizzes assess deep understanding, technical communication, and critical thinking.
- Each quiz counts for **10%** of the **theory grade**.
- **Quiz average:** **PC** = (Quiz 1 + Quiz 2) / 2
</div>

#### Partial exams (PEP)

| Assessment | Date |
|------------|------|
| PEP1 | Mon Jun 8, 2026 |
| PEP2 | Fri Jul 10, 2026 |
| PDR (discussion / redemption) | Mon Jul 13, 2026 |
| PER (per PEP, schedule TBD) | 1–2 weeks after the corresponding PEP |

<div class="syllabus-note" markdown="1">
- Each **PEP** has the **same weight: 40%** of the theory grade.
- Lecture attendance is **voluntary** and **not required** to sit exams.
- The **PDR replaces your lowest PEP score** (subject to eligibility below).
- **PDR eligibility:** the **average of your PEP grades** must be **≥ 3.0**.
</div>

### Laboratory

From **Lab 2** onward, there are **two weeks** between release and due date. Lab 1 has a longer window. Each lab’s **due date** matches the **release** of the next lab; Lab 5 closes with its own due date.

| Lab | Released | Due |
|-----|----------|-----|
| 1 — OpenMP | Apr 2, 2026 | May 8, 2026 |
| 2 — MPI | May 8, 2026 | May 22, 2026 |
| 3 — P2P (sockets) | May 22, 2026 | Jun 5, 2026 |
| 4 — Pub/sub (Kafka/RabbitMQ) | Jun 5, 2026 | Jun 19, 2026 |
| 5 — Blockchain | Jun 19, 2026 | Jul 3, 2026 |

<div class="syllabus-note" markdown="1">
**Lab expectations**

- All labs weigh **equally** toward the lab grade.
- Work must be **reproducible**; submissions use a **GitHub or GitLab** repo **per lab** with a **working in-repo CI** pipeline.
- Include **unit** and **integration** tests and **containers** for run/grade workflows.
- **AI-assisted tooling** for development is **allowed** unless a specific assignment says otherwise.
- Each lab ties to an **exit interview** (concepts, code review, and/or short demo) so every group member can explain the work.
</div>

### Theory and final grades

<div class="syllabus-grade-panel" markdown="1">
Let **NT** be the theory grade and **NL** the lab grade.

- **NT** = 0.2 × **PC** + 0.4 × **PEP₁** + 0.4 × **PEP₂**
- **PC** = (Quiz 1 + Quiz 2) / 2

**Final grade (NF):** if **NT** ≥ 4.0 and **NL** ≥ 4.0 → **NF** = 0.7 × **NT** + 0.3 × **NL**; otherwise **NF** = min(**NT**, **NL**).

**Symbols**

- **NT** — Theory grade  
- **PC** — Quiz average (**20%** of NT)  
- **PEP₁, PEP₂** — Partial exams (**40%** of NT each)  
- **NL** — Laboratory grade  
- **NF** — Final grade  
</div>

## Bibliography

1. Andrew S. Tanenbaum, Maarten van Steen, *Distributed Systems*, 4th ed., 2024 — [distributed-systems.net](https://www.distributed-systems.net/)
2. Peter A. Buhr, Russell A. Stroobosscher, *uC++ Annotated Reference Manual*, v7.0.0, 2024 — [PDF](https://plg.uwaterloo.ca/~usystem/pub/uSystem/uC++.pdf)
3. OpenMP ARB, *OpenMP Application Programming Interface*, v5.2, 2024 — [specification (PDF)](https://www.openmp.org/wp-content/uploads/OpenMP-API-Specification-5.2.pdf)
4. MPI Forum, *MPI: A Message-Passing Interface Standard*, v4.1, 2023 — [report (PDF)](https://www.mpi-forum.org/docs/mpi-4.1/mpi41-report.pdf)
{: .syllabus-bib}

## Other policies

1. **No plagiarism or copying** on exams or in labs.
2. **No phones or tablets** during exams.
3. **Answers without reasoning receive no credit.**
4. Bring **only a bound exam notebook (“cuadernillo”)** for written answers; other formats **will not be accepted**.
5. Writing must be **legible** and **spell-checked**; otherwise answers may **not be graded**.
{: .policy-list}

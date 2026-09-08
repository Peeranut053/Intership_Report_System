-- ============================================================
-- Internship Reporting System
-- PostgreSQL Database Schema
-- ============================================================

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE users (
    user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('student', 'teacher', 'mentor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. MAJORS
-- ============================================================
CREATE TABLE majors (
    major_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    major_name VARCHAR(100) NOT NULL UNIQUE
);

-- ============================================================
-- 3. PROVINCES
-- ============================================================
CREATE TABLE provinces (
    province_id INT PRIMARY KEY,
    province_name VARCHAR(100) NOT NULL UNIQUE
);

-- ============================================================
-- 4. DISTRICTS
-- ============================================================
CREATE TABLE districts (
    district_id INT PRIMARY KEY,
    district_name VARCHAR(100) NOT NULL,
    province_id INT NOT NULL,

    CONSTRAINT fk_districts_province
        FOREIGN KEY (province_id)
        REFERENCES provinces(province_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT uq_districts_name_province
        UNIQUE (district_name, province_id)
);

-- ============================================================
-- 5. SUBDISTRICTS
-- ============================================================
CREATE TABLE subdistricts (
    subdistrict_id INT PRIMARY KEY,
    subdistrict_name VARCHAR(150) NOT NULL,
    district_id INT NOT NULL,

    CONSTRAINT fk_subdistricts_district
        FOREIGN KEY (district_id)
        REFERENCES districts(district_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT uq_subdistricts_name_district
        UNIQUE (subdistrict_name, district_id)
);

-- ============================================================
-- 6. TEACHERS
-- ============================================================
CREATE TABLE teachers (
    teacher_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    teacher_name VARCHAR(100) NOT NULL,

    CONSTRAINT fk_teachers_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ============================================================
-- 7. MENTORS
-- ============================================================
CREATE TABLE mentors (
    mentor_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    mentor_name VARCHAR(100) NOT NULL,

    CONSTRAINT fk_mentors_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ============================================================
-- 8. STUDENTS
-- year_level locked to 4
-- semester locked to 2
-- no education_level
-- ============================================================
CREATE TABLE students (
    student_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    student_code VARCHAR(12) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    major_id INT NOT NULL,

    year_level INT NOT NULL DEFAULT 4,
    semester INT NOT NULL DEFAULT 2,

    internship_place VARCHAR(150) NOT NULL,
    internship_start DATE NOT NULL,
    internship_end DATE NOT NULL,

    CONSTRAINT fk_students_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_students_major
        FOREIGN KEY (major_id)
        REFERENCES majors(major_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_students_code
        CHECK (student_code ~ '^[0-9]{12}$'),

    CONSTRAINT chk_students_year
        CHECK (year_level = 4),

    CONSTRAINT chk_students_semester
        CHECK (semester = 2),

    CONSTRAINT chk_students_internship_date
        CHECK (internship_end >= internship_start)
);

-- ============================================================
-- 9. STUDENT_TEACHERS
-- ============================================================
CREATE TABLE student_teachers (
    student_id INT NOT NULL,
    teacher_id INT NOT NULL,
    teacher_role VARCHAR(20) NOT NULL,

    CONSTRAINT pk_student_teachers
        PRIMARY KEY (student_id, teacher_id, teacher_role),

    CONSTRAINT fk_student_teachers_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_student_teachers_teacher
        FOREIGN KEY (teacher_id)
        REFERENCES teachers(teacher_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_student_teachers_role
        CHECK (teacher_role IN ('advisor', 'supervisor'))
);

-- ============================================================
-- 10. STUDENT_MENTORS
-- ============================================================
CREATE TABLE student_mentors (
    student_id INT NOT NULL,
    mentor_id INT NOT NULL,

    CONSTRAINT pk_student_mentors
        PRIMARY KEY (student_id, mentor_id),

    CONSTRAINT fk_student_mentors_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_student_mentors_mentor
        FOREIGN KEY (mentor_id)
        REFERENCES mentors(mentor_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ============================================================
-- 11. RELIGIONS
-- ============================================================
CREATE TABLE religions (
    religion_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    religion_name VARCHAR(50) NOT NULL UNIQUE
);

-- ============================================================
-- 12. STUDENT_INFO
-- siblings_count and child_order removed
-- ============================================================
CREATE TABLE student_info (
    student_id INT PRIMARY KEY,
    birth_date DATE NOT NULL,
    religion_id INT,

    father_name VARCHAR(100),
    father_job VARCHAR(100),
    mother_name VARCHAR(100),
    mother_job VARCHAR(100),

    past_education VARCHAR(100),
    past_school VARCHAR(150),
    school_district_id INT,

    special_skill TEXT,
    special_interest TEXT,

    CONSTRAINT fk_student_info_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_student_info_religion
        FOREIGN KEY (religion_id)
        REFERENCES religions(religion_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_student_info_school_district
        FOREIGN KEY (school_district_id)
        REFERENCES districts(district_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- ============================================================
-- 13. ADDRESS_TYPES
-- ============================================================
CREATE TABLE address_types (
    type_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL UNIQUE
);

-- ============================================================
-- 14. ADDRESSES
-- ============================================================
CREATE TABLE addresses (
    address_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INT NOT NULL,
    type_id INT NOT NULL,
    house_num VARCHAR(50),
    road VARCHAR(100),
    subdistrict_id INT NOT NULL,

    CONSTRAINT fk_addresses_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_addresses_type
        FOREIGN KEY (type_id)
        REFERENCES address_types(type_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_addresses_subdistrict
        FOREIGN KEY (subdistrict_id)
        REFERENCES subdistricts(subdistrict_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT uq_addresses_student_type
        UNIQUE (student_id, type_id)
);

-- ============================================================
-- 15. PHONE_TYPES
-- ============================================================
CREATE TABLE phone_types (
    phone_type_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone_type VARCHAR(50) NOT NULL UNIQUE
);

-- ============================================================
-- 16. PHONES
-- Thai phone number stored as 9-10 digits
-- ============================================================
CREATE TABLE phones (
    phone_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INT NOT NULL,
    phone_type_id INT NOT NULL,
    phone_number VARCHAR(10) NOT NULL,

    CONSTRAINT fk_phones_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_phones_type
        FOREIGN KEY (phone_type_id)
        REFERENCES phone_types(phone_type_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT uq_phones_student_number
        UNIQUE (student_id, phone_number),

    CONSTRAINT chk_phone_number
        CHECK (phone_number ~ '^[0-9]{9,10}$')
);

-- ============================================================
-- 17. DAILY_REPORTS
-- ============================================================
CREATE TABLE daily_reports (
    report_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INT NOT NULL,
    report_date DATE NOT NULL,
    work_description TEXT NOT NULL,

    -- Added for the daily report form (student-facing "บันทึกการปฏิบัติงาน"):
    company_location VARCHAR(255),   -- ที่ตั้งสถานประกอบการ (free text, student-entered)
    work_place VARCHAR(150),         -- สถานที่ฝึก (e.g. department/section)
    supervisor_name VARCHAR(100),    -- ผู้ควบคุมการฝึก (on-site supervisor for that day)

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_daily_reports_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT uq_daily_reports_student_date
        UNIQUE (student_id, report_date)
);

-- ============================================================
-- 18. REPORT_CHECKS
-- ============================================================
CREATE TABLE report_checks (
    report_id INT NOT NULL,
    mentor_id INT NOT NULL,
    checked BOOLEAN NOT NULL DEFAULT FALSE,
    checked_at TIMESTAMPTZ,

    CONSTRAINT pk_report_checks
        PRIMARY KEY (report_id, mentor_id),

    CONSTRAINT fk_report_checks_report
        FOREIGN KEY (report_id)
        REFERENCES daily_reports(report_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_report_checks_mentor
        FOREIGN KEY (mentor_id)
        REFERENCES mentors(mentor_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ============================================================
-- 19. SUBMISSIONS
-- ============================================================
CREATE TABLE submissions (
    submission_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_submissions_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ============================================================
-- 20. ATTENDANCES
-- ============================================================
CREATE TABLE attendances (
    attendance_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INT NOT NULL,
    mentor_id INT NOT NULL,
    check_date DATE NOT NULL DEFAULT CURRENT_DATE,
    period VARCHAR(10) NOT NULL, -- 'morning' (เข้า/เช้า) or 'afternoon' (บ่าย) — the paper form tracks each half-day separately
    status VARCHAR(20) NOT NULL,

    CONSTRAINT fk_attendances_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_attendances_mentor
        FOREIGN KEY (mentor_id)
        REFERENCES mentors(mentor_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_attendances_period
        CHECK (period IN ('morning', 'afternoon')),

    CONSTRAINT chk_attendances_status
        CHECK (status IN (
            'present',
            'late',
            'leave_early',
            'sick',
            'leave',
            'absent'
        )),

    CONSTRAINT uq_attendances_student_date_period
        UNIQUE (student_id, check_date, period)
);

-- ============================================================
-- 21. EVALUATION_CATEGORIES
-- ============================================================
CREATE TABLE evaluation_categories (
    category_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_name VARCHAR(150) NOT NULL UNIQUE
);

-- ============================================================
-- 22. EVALUATION_QUESTIONS
-- ============================================================
CREATE TABLE evaluation_questions (
    question_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id INT NOT NULL,
    question_no INT NOT NULL,
    question VARCHAR(255) NOT NULL,

    CONSTRAINT fk_evaluation_questions_category
        FOREIGN KEY (category_id)
        REFERENCES evaluation_categories(category_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT uq_evaluation_questions_number
        UNIQUE (category_id, question_no),

    CONSTRAINT chk_evaluation_question_no
        CHECK (question_no > 0)
);

-- ============================================================
-- 23. EVALUATION_FORMS
-- 3NF: total_score is NOT stored here.
-- It is calculated from evaluation_scores instead.
-- ============================================================
CREATE TABLE evaluation_forms (
    evaluation_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INT NOT NULL,
    evaluator_type VARCHAR(20) NOT NULL,
    -- Which evaluation_categories row this form's questions/scores belong to
    -- (mentors currently only ever create one category of form; teachers can
    -- have more than one, e.g. the สมุดบันทึก notebook evaluation vs a future
    -- overall-performance evaluation — evaluator_type alone can't tell those
    -- apart, so category_id disambiguates the find-or-create lookup).
    category_id INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_evaluation_forms_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_evaluation_forms_category
        FOREIGN KEY (category_id)
        REFERENCES evaluation_categories(category_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_evaluation_forms_type
        CHECK (evaluator_type IN ('teacher', 'mentor'))
);

-- ============================================================
-- 24. EVALUATION_SCORES
-- Scores 1-4
-- ============================================================
CREATE TABLE evaluation_scores (
    score_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    evaluation_id INT NOT NULL,
    question_id INT NOT NULL,
    score INT NOT NULL,

    CONSTRAINT fk_evaluation_scores_evaluation
        FOREIGN KEY (evaluation_id)
        REFERENCES evaluation_forms(evaluation_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_evaluation_scores_question
        FOREIGN KEY (question_id)
        REFERENCES evaluation_questions(question_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT uq_evaluation_scores_question
        UNIQUE (evaluation_id, question_id),

    CONSTRAINT chk_evaluation_score
        CHECK (score BETWEEN 1 AND 4)
);

-- ============================================================
-- 25. EVALUATION_TEACHERS
-- ============================================================
CREATE TABLE evaluation_teachers (
    evaluation_id INT NOT NULL,
    teacher_id INT NOT NULL,

    CONSTRAINT pk_evaluation_teachers
        PRIMARY KEY (evaluation_id, teacher_id),

    CONSTRAINT fk_evaluation_teachers_evaluation
        FOREIGN KEY (evaluation_id)
        REFERENCES evaluation_forms(evaluation_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_evaluation_teachers_teacher
        FOREIGN KEY (teacher_id)
        REFERENCES teachers(teacher_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ============================================================
-- 26. EVALUATION_MENTORS
-- ============================================================
CREATE TABLE evaluation_mentors (
    evaluation_id INT NOT NULL,
    mentor_id INT NOT NULL,

    CONSTRAINT pk_evaluation_mentors
        PRIMARY KEY (evaluation_id, mentor_id),

    CONSTRAINT fk_evaluation_mentors_evaluation
        FOREIGN KEY (evaluation_id)
        REFERENCES evaluation_forms(evaluation_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_evaluation_mentors_mentor
        FOREIGN KEY (mentor_id)
        REFERENCES mentors(mentor_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ============================================================
-- 27. MENTOR_EVALUATION_DETAILS
-- ============================================================
CREATE TABLE mentor_evaluation_details (
    evaluation_id INT PRIMARY KEY,
    problem_note TEXT,
    suggestion TEXT,
    special_skill TEXT,
    other_comment TEXT,

    CONSTRAINT fk_mentor_evaluation_details_evaluation
        FOREIGN KEY (evaluation_id)
        REFERENCES evaluation_forms(evaluation_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ============================================================
-- 28. SUPERVISIONS
-- ============================================================
-- One row per นิเทศ visit (just the date) — the topics discussed during
-- that visit each get their own row in supervision_topics below, since one
-- visit can cover several topics, each with its own detail.
CREATE TABLE supervisions (
    supervision_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INT NOT NULL,
    supervision_date DATE NOT NULL,

    CONSTRAINT fk_supervisions_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ============================================================
-- 28B. SUPERVISION_TOPICS
-- ============================================================
CREATE TABLE supervision_topics (
    topic_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    supervision_id INT NOT NULL,
    topic VARCHAR(255) NOT NULL,
    detail TEXT,
    sort_order INT NOT NULL DEFAULT 0,

    CONSTRAINT fk_supervision_topics_supervision
        FOREIGN KEY (supervision_id)
        REFERENCES supervisions(supervision_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ============================================================
-- 29. SUPERVISION_TEACHERS
-- ============================================================
CREATE TABLE supervision_teachers (
    supervision_id INT NOT NULL,
    teacher_id INT NOT NULL,

    CONSTRAINT pk_supervision_teachers
        PRIMARY KEY (supervision_id, teacher_id),

    CONSTRAINT fk_supervision_teachers_supervision
        FOREIGN KEY (supervision_id)
        REFERENCES supervisions(supervision_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_supervision_teachers_teacher
        FOREIGN KEY (teacher_id)
        REFERENCES teachers(teacher_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ============================================================
-- VIEW: EVALUATION_TOTALS
-- คำนวณคะแนนรวมจาก evaluation_scores
-- เพื่อไม่เก็บ total_score ซ้ำใน evaluation_forms
-- ============================================================
CREATE VIEW evaluation_totals AS
SELECT
    ef.evaluation_id,
    ef.student_id,
    ef.evaluator_type,
    COALESCE(SUM(es.score), 0)::INT AS total_score,
    ef.created_at
FROM evaluation_forms ef
LEFT JOIN evaluation_scores es
    ON es.evaluation_id = ef.evaluation_id
GROUP BY
    ef.evaluation_id,
    ef.student_id,
    ef.evaluator_type,
    ef.created_at;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_students_major_id
    ON students(major_id);

CREATE INDEX idx_student_teachers_teacher_id
    ON student_teachers(teacher_id);

CREATE INDEX idx_student_mentors_mentor_id
    ON student_mentors(mentor_id);

CREATE INDEX idx_districts_province_id
    ON districts(province_id);

CREATE INDEX idx_subdistricts_district_id
    ON subdistricts(district_id);

CREATE INDEX idx_addresses_subdistrict_id
    ON addresses(subdistrict_id);

CREATE INDEX idx_phones_student_id
    ON phones(student_id);

CREATE INDEX idx_daily_reports_student_id
    ON daily_reports(student_id);

CREATE INDEX idx_daily_reports_report_date
    ON daily_reports(report_date);

CREATE INDEX idx_report_checks_mentor_id
    ON report_checks(mentor_id);

CREATE INDEX idx_submissions_student_id
    ON submissions(student_id);

CREATE INDEX idx_attendances_student_id
    ON attendances(student_id);

CREATE INDEX idx_attendances_check_date
    ON attendances(check_date);

CREATE INDEX idx_evaluation_questions_category_id
    ON evaluation_questions(category_id);

CREATE INDEX idx_evaluation_forms_student_id
    ON evaluation_forms(student_id);

CREATE INDEX idx_evaluation_scores_evaluation_id
    ON evaluation_scores(evaluation_id);

CREATE INDEX idx_evaluation_scores_question_id
    ON evaluation_scores(question_id);

CREATE INDEX idx_supervisions_student_id
    ON supervisions(student_id);

CREATE INDEX idx_supervisions_date
    ON supervisions(supervision_date);

CREATE INDEX idx_supervision_topics_supervision_id
    ON supervision_topics(supervision_id);

-- ============================================================
-- 30. PASSWORD_RESET_TOKENS
-- Self-service "forgot password" flow (see authController.ts
-- forgotPassword/resetPassword). Only the SHA-256 hash of the raw token is
-- stored — the raw token only ever exists in the emailed link — so a DB
-- leak alone can't be used to reset anyone's password.
-- ============================================================
CREATE TABLE password_reset_tokens (
    token_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_password_reset_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX idx_password_reset_tokens_user_id
    ON password_reset_tokens(user_id);

-- ============================================================
-- INITIAL DATA
-- ============================================================
INSERT INTO religions (religion_name)
VALUES
    ('พุทธ'),
    ('คริสต์'),
    ('อิสลาม');

INSERT INTO address_types (type_name)
VALUES
    ('ที่อยู่ตามทะเบียนบ้าน'),
    ('ที่อยู่ปัจจุบัน');

INSERT INTO phone_types (phone_type)
VALUES
    ('โทรศัพท์มือถือ'),
    ('โทรศัพท์บ้าน');

-- Evaluation categories currently in use. evaluation_forms.category_id
-- disambiguates which category's questions/scores a form belongs to, since
-- evaluator_type alone can't tell apart a teacher's or mentor's multiple
-- possible evaluation forms.
INSERT INTO evaluation_categories (category_name)
VALUES
    ('แบบประเมินผลการฝึกประสบการณ์วิชาชีพ (สถานประกอบการ)'),          -- mentor's evaluation form
    ('แบบประเมินผลสมุดบันทึกการฝึกประสบการณ์วิชาชีพ (สำหรับอาจารย์นิเทศ)'); -- teacher's notebook evaluation

-- The teacher's 5-question notebook evaluation (ประเมินผลสมุดบันทึก).
INSERT INTO evaluation_questions (category_id, question_no, question)
SELECT ec.category_id, q.no, q.question
FROM evaluation_categories ec
CROSS JOIN (VALUES
    (1, 'ความสม่ำเสมอและเป็นปัจจุบันในการบันทึกการปฏิบัติงาน'),
    (2, 'เนื้อหาสาระครบถ้วนสมบูรณ์ ชัดเจน'),
    (3, 'ความสะอาดและเป็นระเบียบเรียบร้อยของสมุดบันทึก'),
    (4, 'การระบุคุณค่าและประโยชน์ที่ได้รับมีความละเอียดชัดเจน'),
    (5, 'ความละเอียดถี่ถ้วนในการบันทึกผลการปฏิบัติงานตามที่ได้รับมอบหมาย')
) AS q(no, question)
WHERE ec.category_name = 'แบบประเมินผลสมุดบันทึกการฝึกประสบการณ์วิชาชีพ (สำหรับอาจารย์นิเทศ)';

-- The mentor's 20-question evaluation (ประเมินผลนักศึกษา, สถานประกอบการ).
INSERT INTO evaluation_questions (category_id, question_no, question)
SELECT ec.category_id, q.no, q.question
FROM evaluation_categories ec
CROSS JOIN (VALUES
    (1, 'ปฏิบัติตามคำสั่ง กฎ อย่างเคร่งครัด'),
    (2, 'แต่งกายสุภาพเรียบร้อยและถูกต้องตามระเบียบ'),
    (3, 'เข้ารับฝึกงานตรงต่อเวลาและสม่ำเสมอ'),
    (4, 'อดทนและขยันขันแข็งในการทำงาน'),
    (5, 'กิริยา วาจา สุภาพอ่อนน้อม'),
    (6, 'การเชื่อฟังคำแนะนำของหัวหน้า'),
    (7, 'การแก้ปัญหาเฉพาะหน้าในการทำงาน'),
    (8, 'เจตคติที่ดีต่องานและหน่วยงาน'),
    (9, 'ความคิดริเริ่มสร้างสรรค์ในการปรับปรุงงาน'),
    (10, 'ความตั้งใจและเอาใจใส่ในการทำงาน'),
    (11, 'ใช้พัสดุอย่างประหยัด'),
    (12, 'ทำงานถูกต้องตามขั้นตอน'),
    (13, 'คำนึงถึงหลักความปลอดภัย'),
    (14, 'ใช้เครื่องมืออุปกรณ์อย่างระมัดระวังและถูกต้อง'),
    (15, 'มีมนุษย์สัมพันธ์กับเพื่อนร่วมงาน'),
    (16, 'ถูกต้องตามรูปแบบและหลักเกณฑ์'),
    (17, 'เสร็จเรียบร้อยภายในเวลาที่กำหนด'),
    (18, 'ความประณีตของผลงาน'),
    (19, 'ได้มาตรฐานเป็นตัวอย่างที่ดี'),
    (20, 'นำไปใช้ประโยชน์ได้')
) AS q(no, question)
WHERE ec.category_name = 'แบบประเมินผลการฝึกประสบการณ์วิชาชีพ (สถานประกอบการ)';


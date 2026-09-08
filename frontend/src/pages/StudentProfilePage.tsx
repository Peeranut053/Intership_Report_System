import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  fetchDistricts,
  fetchMentors,
  fetchProvinces,
  fetchReligions,
  fetchStudentProfile,
  fetchSubdistricts,
  fetchTeachers,
  updateStudentInfo,
  updateStudentProfile,
} from "../api";
import type {
  District,
  Mentor,
  Province,
  Religion,
  StudentAddress,
  StudentInfoInput,
  StudentProfile,
  Subdistrict,
  Teacher,
} from "../types";
import { SearchableSelect } from "../components/SearchableSelect";

interface StudentProfilePageProps {
  token: string;
}

const EMPTY_CORE_FORM = {
  studentCode: "",
  firstName: "",
  lastName: "",
  internshipPlace: "",
  internshipStart: "",
  internshipEnd: "",
  mentorId: "",
  advisorTeacherId: "",
  supervisorTeacherId1: "",
  supervisorTeacherId2: "",
};

type CoreFormState = typeof EMPTY_CORE_FORM;

const EMPTY_INFO: StudentInfoInput = {
  birthDate: "",
  religionId: null,
  phoneMobile: "",
  fatherName: "",
  fatherJob: "",
  motherName: "",
  motherJob: "",
  pastEducation: "",
  pastSchool: "",
  schoolDistrictId: null,
  specialSkill: "",
  specialInterest: "",
  permanentHouseNum: "",
  permanentRoad: "",
  permanentSubdistrictId: null,
  currentHouseNum: "",
  currentRoad: "",
  currentSubdistrictId: null,
};

// Prefills the จังหวัด/อำเภอ selects for one address block from the joined
// data the profile already returned (province/district names+ids), so the
// cascading fetch below only has to load the ตำบล level, not re-derive
// province/district from a bare subdistrict id.
function initialLocation(address: StudentAddress | null): { provinceId: number | null; districtId: number | null } {
  if (!address) return { provinceId: null, districtId: null };
  return { provinceId: address.provinceId, districtId: address.districtId };
}

export function StudentProfilePage({ token }: StudentProfilePageProps) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [religions, setReligions] = useState<Religion[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [coreForm, setCoreForm] = useState<CoreFormState>(EMPTY_CORE_FORM);
  const [coreError, setCoreError] = useState<string | null>(null);
  const [coreSuccess, setCoreSuccess] = useState<string | null>(null);
  const [coreSubmitting, setCoreSubmitting] = useState(false);

  const [form, setForm] = useState<StudentInfoInput>(EMPTY_INFO);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Independent จังหวัด→อำเภอ→ตำบล cascades for the two address blocks.
  const [permanentProvinceId, setPermanentProvinceId] = useState<number | null>(null);
  const [permanentDistrictId, setPermanentDistrictId] = useState<number | null>(null);
  const [permanentDistricts, setPermanentDistricts] = useState<District[]>([]);
  const [permanentSubdistricts, setPermanentSubdistricts] = useState<Subdistrict[]>([]);

  const [currentProvinceId, setCurrentProvinceId] = useState<number | null>(null);
  const [currentDistrictId, setCurrentDistrictId] = useState<number | null>(null);
  const [currentDistricts, setCurrentDistricts] = useState<District[]>([]);
  const [currentSubdistricts, setCurrentSubdistricts] = useState<Subdistrict[]>([]);

  function applyProfile(p: StudentProfile) {
    setProfile(p);
    setCoreForm({
      studentCode: p.studentCode,
      firstName: p.firstName,
      lastName: p.lastName,
      internshipPlace: p.internshipPlace,
      internshipStart: p.internshipStart.slice(0, 10),
      internshipEnd: p.internshipEnd.slice(0, 10),
      mentorId: p.mentorId ? String(p.mentorId) : "",
      advisorTeacherId: p.advisorTeacherId ? String(p.advisorTeacherId) : "",
      supervisorTeacherId1: p.supervisorTeacherIds[0] ? String(p.supervisorTeacherIds[0]) : "",
      supervisorTeacherId2: p.supervisorTeacherIds[1] ? String(p.supervisorTeacherIds[1]) : "",
    });
    setForm({
      birthDate: p.birthDate ? p.birthDate.slice(0, 10) : "",
      religionId: p.religionId,
      phoneMobile: p.phoneMobile ?? "",
      fatherName: p.fatherName ?? "",
      fatherJob: p.fatherJob ?? "",
      motherName: p.motherName ?? "",
      motherJob: p.motherJob ?? "",
      pastEducation: p.pastEducation ?? "",
      pastSchool: p.pastSchool ?? "",
      schoolDistrictId: p.schoolDistrictId,
      specialSkill: p.specialSkill ?? "",
      specialInterest: p.specialInterest ?? "",
      permanentHouseNum: p.permanentAddress?.houseNum ?? "",
      permanentRoad: p.permanentAddress?.road ?? "",
      permanentSubdistrictId: p.permanentAddress?.subdistrictId ?? null,
      currentHouseNum: p.currentAddress?.houseNum ?? "",
      currentRoad: p.currentAddress?.road ?? "",
      currentSubdistrictId: p.currentAddress?.subdistrictId ?? null,
    });
    setSelectedProvinceId(p.schoolProvinceId ?? null);
    const permanentLocation = initialLocation(p.permanentAddress);
    setPermanentProvinceId(permanentLocation.provinceId);
    setPermanentDistrictId(permanentLocation.districtId);
    const currentLocation = initialLocation(p.currentAddress);
    setCurrentProvinceId(currentLocation.provinceId);
    setCurrentDistrictId(currentLocation.districtId);
  }

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchStudentProfile(token), fetchTeachers(), fetchMentors(), fetchReligions(), fetchProvinces()])
      .then(([profileRes, teachersRes, mentorsRes, religionsRes, provincesRes]) => {
        if (cancelled) return;
        applyProfile(profileRes.profile);
        setTeachers(teachersRes.teachers);
        setMentors(mentorsRes.mentors);
        setReligions(religionsRes.religions);
        setProvinces(provincesRes.provinces);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Reload อำเภอ options whenever the selected จังหวัด changes. The
  // district already saved on the profile (form.schoolDistrictId) stays
  // selected the first time this runs for the profile's own province.
  useEffect(() => {
    if (!selectedProvinceId) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    fetchDistricts(selectedProvinceId)
      .then((res) => {
        if (!cancelled) setDistricts(res.districts);
      })
      .catch(() => {
        if (!cancelled) setDistricts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProvinceId]);

  // อำเภอ options for ที่อยู่ตามทะเบียนบ้าน, driven by its own จังหวัด select.
  useEffect(() => {
    if (!permanentProvinceId) {
      setPermanentDistricts([]);
      return;
    }
    let cancelled = false;
    fetchDistricts(permanentProvinceId)
      .then((res) => {
        if (!cancelled) setPermanentDistricts(res.districts);
      })
      .catch(() => {
        if (!cancelled) setPermanentDistricts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [permanentProvinceId]);

  // ตำบล options for ที่อยู่ตามทะเบียนบ้าน, driven by its own อำเภอ select.
  useEffect(() => {
    if (!permanentDistrictId) {
      setPermanentSubdistricts([]);
      return;
    }
    let cancelled = false;
    fetchSubdistricts(permanentDistrictId)
      .then((res) => {
        if (!cancelled) setPermanentSubdistricts(res.subdistricts);
      })
      .catch(() => {
        if (!cancelled) setPermanentSubdistricts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [permanentDistrictId]);

  // Same pair of cascades, for ที่อยู่ปัจจุบัน.
  useEffect(() => {
    if (!currentProvinceId) {
      setCurrentDistricts([]);
      return;
    }
    let cancelled = false;
    fetchDistricts(currentProvinceId)
      .then((res) => {
        if (!cancelled) setCurrentDistricts(res.districts);
      })
      .catch(() => {
        if (!cancelled) setCurrentDistricts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentProvinceId]);

  useEffect(() => {
    if (!currentDistrictId) {
      setCurrentSubdistricts([]);
      return;
    }
    let cancelled = false;
    fetchSubdistricts(currentDistrictId)
      .then((res) => {
        if (!cancelled) setCurrentSubdistricts(res.subdistricts);
      })
      .catch(() => {
        if (!cancelled) setCurrentSubdistricts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentDistrictId]);

  // Memoized so each SearchableSelect only sees a new `options` array when
  // the underlying list actually changes — otherwise a re-render triggered
  // by an unrelated field (a fresh array from an inline .map every render)
  // would re-fire that select's value-sync effect and could clobber
  // in-progress typing in a still-unmatched field.
  const provinceOptions = useMemo(
    () => provinces.map((province) => ({ id: province.province_id, label: province.province_name })),
    [provinces]
  );
  const schoolDistrictOptions = useMemo(
    () => districts.map((district) => ({ id: district.district_id, label: district.district_name })),
    [districts]
  );
  const permanentDistrictOptions = useMemo(
    () => permanentDistricts.map((district) => ({ id: district.district_id, label: district.district_name })),
    [permanentDistricts]
  );
  const permanentSubdistrictOptions = useMemo(
    () =>
      permanentSubdistricts.map((subdistrict) => ({
        id: subdistrict.subdistrict_id,
        label: subdistrict.subdistrict_name,
      })),
    [permanentSubdistricts]
  );
  const currentDistrictOptions = useMemo(
    () => currentDistricts.map((district) => ({ id: district.district_id, label: district.district_name })),
    [currentDistricts]
  );
  const currentSubdistrictOptions = useMemo(
    () =>
      currentSubdistricts.map((subdistrict) => ({
        id: subdistrict.subdistrict_id,
        label: subdistrict.subdistrict_name,
      })),
    [currentSubdistricts]
  );

  function updateCoreField<K extends keyof CoreFormState>(key: K, value: CoreFormState[K]) {
    setCoreForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateField<K extends keyof StudentInfoInput>(key: K, value: StudentInfoInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleProvinceChange(id: number | null) {
    setSelectedProvinceId(id);
    updateField("schoolDistrictId", null);
  }

  function handlePermanentProvinceChange(id: number | null) {
    setPermanentProvinceId(id);
    setPermanentDistrictId(null);
    updateField("permanentSubdistrictId", null);
  }

  function handlePermanentDistrictChange(id: number | null) {
    setPermanentDistrictId(id);
    updateField("permanentSubdistrictId", null);
  }

  function handleCurrentProvinceChange(id: number | null) {
    setCurrentProvinceId(id);
    setCurrentDistrictId(null);
    updateField("currentSubdistrictId", null);
  }

  function handleCurrentDistrictChange(id: number | null) {
    setCurrentDistrictId(id);
    updateField("currentSubdistrictId", null);
  }

  async function handleCoreSubmit(event: FormEvent) {
    event.preventDefault();
    setCoreError(null);
    setCoreSuccess(null);

    if (coreForm.supervisorTeacherId1 && coreForm.supervisorTeacherId1 === coreForm.supervisorTeacherId2) {
      setCoreError("อาจารย์นิเทศ 2 คนต้องไม่ใช่คนเดียวกัน");
      return;
    }

    setCoreSubmitting(true);
    try {
      const res = await updateStudentProfile(token, {
        studentCode: coreForm.studentCode,
        firstName: coreForm.firstName,
        lastName: coreForm.lastName,
        internshipPlace: coreForm.internshipPlace,
        internshipStart: coreForm.internshipStart,
        internshipEnd: coreForm.internshipEnd,
        mentorId: Number(coreForm.mentorId),
        advisorTeacherId: Number(coreForm.advisorTeacherId),
        supervisorTeacherIds: [Number(coreForm.supervisorTeacherId1), Number(coreForm.supervisorTeacherId2)],
      });
      setCoreSuccess(res.message);
      const refreshed = await fetchStudentProfile(token);
      applyProfile(refreshed.profile);
    } catch (err) {
      setCoreError(err instanceof Error ? err.message : "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setCoreSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      const res = await updateStudentInfo(token, form);
      setSuccessMessage(res.message);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p>กำลังโหลดข้อมูล...</p>;
  }

  if (loadError || !profile) {
    return <p className="form-error">{loadError ?? "ไม่พบข้อมูลนักศึกษา"}</p>;
  }

  return (
    <div className="report-page">
      {/* Editable: student code/name, internship place & dates, and the
          advisor/2 supervisors/mentor assignment. Changing personnel here
          replaces the student_teachers/student_mentors rows entirely. */}
      <form onSubmit={handleCoreSubmit} className="report-card">
        <h2 className="report-title">แก้ไขข้อมูลนักศึกษา</h2>

        <h3 className="report-history-title">ข้อมูลนักศึกษา</h3>
        <div className="report-form">
          <label className="field">
            <span className="field-label">รหัสนักศึกษา (ตัวเลข 12 หลัก)</span>
            <input
              className="input-plain"
              value={coreForm.studentCode}
              onChange={(event) => updateCoreField("studentCode", event.target.value)}
              pattern="[0-9]{12}"
              title="ตัวเลข 12 หลัก"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">ชื่อ</span>
            <input
              className="input-plain"
              value={coreForm.firstName}
              onChange={(event) => updateCoreField("firstName", event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">นามสกุล</span>
            <input
              className="input-plain"
              value={coreForm.lastName}
              onChange={(event) => updateCoreField("lastName", event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">สาขาวิชา</span>
            <input className="input-plain" value={profile.majorName} disabled />
          </label>
          <label className="field">
            <span className="field-label">ชั้นปีที่ / ภาคการศึกษาที่</span>
            <input
              className="input-plain"
              value={`ปีที่ ${profile.yearLevel} / ภาคเรียนที่ ${profile.semester}`}
              disabled
            />
          </label>
        </div>

        <h3 className="report-history-title section-title">ข้อมูลการฝึกประสบการณ์</h3>
        <div className="report-form">
          <label className="field">
            <span className="field-label">วันที่เริ่มฝึก</span>
            <input
              className="input-plain"
              type="date"
              value={coreForm.internshipStart}
              onChange={(event) => updateCoreField("internshipStart", event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">วันที่สิ้นสุดการฝึก</span>
            <input
              className="input-plain"
              type="date"
              value={coreForm.internshipEnd}
              onChange={(event) => updateCoreField("internshipEnd", event.target.value)}
              required
            />
          </label>
          <label className="field form-span">
            <span className="field-label">สถานที่ฝึก</span>
            <input
              className="input-plain"
              value={coreForm.internshipPlace}
              onChange={(event) => updateCoreField("internshipPlace", event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">ชื่อผู้ควบคุมการฝึก (พี่เลี้ยง)</span>
            <select
              className="input-plain"
              value={coreForm.mentorId}
              onChange={(event) => updateCoreField("mentorId", event.target.value)}
              required
            >
              <option value="" disabled>
                เลือกพี่เลี้ยง
              </option>
              {mentors.map((mentor) => (
                <option key={mentor.mentor_id} value={mentor.mentor_id}>
                  {mentor.mentor_name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <h3 className="report-history-title section-title">บุคลากรที่เกี่ยวข้อง</h3>
        <div className="report-form">
          <label className="field">
            <span className="field-label">อาจารย์ที่ปรึกษา</span>
            <select
              className="input-plain"
              value={coreForm.advisorTeacherId}
              onChange={(event) => updateCoreField("advisorTeacherId", event.target.value)}
              required
            >
              <option value="" disabled>
                เลือกอาจารย์ที่ปรึกษา
              </option>
              {teachers.map((teacher) => (
                <option key={teacher.teacher_id} value={teacher.teacher_id}>
                  {teacher.teacher_name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">อาจารย์นิเทศ คนที่ 1</span>
            <select
              className="input-plain"
              value={coreForm.supervisorTeacherId1}
              onChange={(event) => updateCoreField("supervisorTeacherId1", event.target.value)}
              required
            >
              <option value="" disabled>
                เลือกอาจารย์นิเทศ
              </option>
              {teachers.map((teacher) => (
                <option key={teacher.teacher_id} value={teacher.teacher_id}>
                  {teacher.teacher_name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">อาจารย์นิเทศ คนที่ 2</span>
            <select
              className="input-plain"
              value={coreForm.supervisorTeacherId2}
              onChange={(event) => updateCoreField("supervisorTeacherId2", event.target.value)}
              required
            >
              <option value="" disabled>
                เลือกอาจารย์นิเทศ
              </option>
              {teachers.map((teacher) => (
                <option key={teacher.teacher_id} value={teacher.teacher_id}>
                  {teacher.teacher_name}
                </option>
              ))}
            </select>
          </label>

          {coreError && <p className="form-error form-span">{coreError}</p>}
          {coreSuccess && <p className="form-success form-span">{coreSuccess}</p>}

          <div className="form-span report-form-actions">
            <button type="submit" className="btn-primary" disabled={coreSubmitting}>
              {coreSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูลนักศึกษา"}
            </button>
          </div>
        </div>
      </form>

      {/* Editable: personal / family / previous-education — student_info
          table, saved lazily (no row exists until the first successful save). */}
      <form onSubmit={handleSubmit} className="report-card">
        <h3 className="report-history-title">ข้อมูลส่วนตัวและครอบครัว</h3>
        <div className="report-form">
          <label className="field">
            <span className="field-label">วันเกิด</span>
            <input
              className="input-plain"
              type="date"
              value={form.birthDate}
              onChange={(event) => updateField("birthDate", event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">เบอร์โทรศัพท์ (มือถือ)</span>
            <input
              className="input-plain"
              value={form.phoneMobile}
              onChange={(event) => updateField("phoneMobile", event.target.value)}
              pattern="[0-9]{9,10}"
              title="ตัวเลข 9-10 หลัก"
              placeholder="เช่น 0812345678"
            />
          </label>
          <label className="field">
            <span className="field-label">นับถือศาสนา</span>
            <select
              className="input-plain"
              value={form.religionId ?? ""}
              onChange={(event) =>
                updateField("religionId", event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">ไม่ระบุ</option>
              {religions.map((religion) => (
                <option key={religion.religion_id} value={religion.religion_id}>
                  {religion.religion_name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">ชื่อบิดา</span>
            <input
              className="input-plain"
              value={form.fatherName}
              onChange={(event) => updateField("fatherName", event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">อาชีพบิดา</span>
            <input
              className="input-plain"
              value={form.fatherJob}
              onChange={(event) => updateField("fatherJob", event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">ชื่อมารดา</span>
            <input
              className="input-plain"
              value={form.motherName}
              onChange={(event) => updateField("motherName", event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">อาชีพมารดา</span>
            <input
              className="input-plain"
              value={form.motherJob}
              onChange={(event) => updateField("motherJob", event.target.value)}
            />
          </label>
        </div>

        <h3 className="report-history-title section-title">ที่อยู่ตามทะเบียนบ้าน</h3>
        <div className="report-form">
          <label className="field">
            <span className="field-label">บ้านเลขที่</span>
            <input
              className="input-plain"
              value={form.permanentHouseNum}
              onChange={(event) => updateField("permanentHouseNum", event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">ถนน</span>
            <input
              className="input-plain"
              value={form.permanentRoad}
              onChange={(event) => updateField("permanentRoad", event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">จังหวัด</span>
            <SearchableSelect
              options={provinceOptions}
              value={permanentProvinceId}
              onChange={handlePermanentProvinceChange}
              placeholder="พิมพ์เพื่อค้นหาจังหวัด"
            />
          </label>
          <label className="field">
            <span className="field-label">อำเภอ</span>
            <SearchableSelect
              options={permanentDistrictOptions}
              value={permanentDistrictId}
              onChange={handlePermanentDistrictChange}
              placeholder="พิมพ์เพื่อค้นหาอำเภอ"
              disabled={!permanentProvinceId}
            />
          </label>
          <label className="field">
            <span className="field-label">ตำบล</span>
            <SearchableSelect
              options={permanentSubdistrictOptions}
              value={form.permanentSubdistrictId}
              onChange={(id) => updateField("permanentSubdistrictId", id)}
              placeholder="พิมพ์เพื่อค้นหาตำบล"
              disabled={!permanentDistrictId}
            />
          </label>
        </div>

        <h3 className="report-history-title section-title">ที่อยู่ปัจจุบัน</h3>
        <div className="report-form">
          <label className="field">
            <span className="field-label">บ้านเลขที่</span>
            <input
              className="input-plain"
              value={form.currentHouseNum}
              onChange={(event) => updateField("currentHouseNum", event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">ถนน</span>
            <input
              className="input-plain"
              value={form.currentRoad}
              onChange={(event) => updateField("currentRoad", event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">จังหวัด</span>
            <SearchableSelect
              options={provinceOptions}
              value={currentProvinceId}
              onChange={handleCurrentProvinceChange}
              placeholder="พิมพ์เพื่อค้นหาจังหวัด"
            />
          </label>
          <label className="field">
            <span className="field-label">อำเภอ</span>
            <SearchableSelect
              options={currentDistrictOptions}
              value={currentDistrictId}
              onChange={handleCurrentDistrictChange}
              placeholder="พิมพ์เพื่อค้นหาอำเภอ"
              disabled={!currentProvinceId}
            />
          </label>
          <label className="field">
            <span className="field-label">ตำบล</span>
            <SearchableSelect
              options={currentSubdistrictOptions}
              value={form.currentSubdistrictId}
              onChange={(id) => updateField("currentSubdistrictId", id)}
              placeholder="พิมพ์เพื่อค้นหาตำบล"
              disabled={!currentDistrictId}
            />
          </label>
        </div>

        <h3 className="report-history-title section-title">การศึกษาเดิมและความสนใจ</h3>
        <div className="report-form">
          <label className="field">
            <span className="field-label">วุฒิก่อนเข้าเรียน</span>
            <input
              className="input-plain"
              placeholder="เช่น มัธยมศึกษาตอนปลาย"
              value={form.pastEducation}
              onChange={(event) => updateField("pastEducation", event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">สถานศึกษา</span>
            <input
              className="input-plain"
              value={form.pastSchool}
              onChange={(event) => updateField("pastSchool", event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">จังหวัด (สถานศึกษาเดิม)</span>
            <SearchableSelect
              options={provinceOptions}
              value={selectedProvinceId}
              onChange={handleProvinceChange}
              placeholder="พิมพ์เพื่อค้นหาจังหวัด"
            />
          </label>
          <label className="field">
            <span className="field-label">อำเภอ (สถานศึกษาเดิม)</span>
            <SearchableSelect
              options={schoolDistrictOptions}
              value={form.schoolDistrictId}
              onChange={(id) => updateField("schoolDistrictId", id)}
              placeholder="พิมพ์เพื่อค้นหาอำเภอ"
              disabled={!selectedProvinceId}
            />
          </label>

          <label className="field form-span">
            <span className="field-label">ความรู้ความสามารถพิเศษ</span>
            <textarea
              className="input-plain textarea-plain"
              value={form.specialSkill}
              onChange={(event) => updateField("specialSkill", event.target.value)}
            />
          </label>
          <label className="field form-span">
            <span className="field-label">ความสนใจพิเศษ</span>
            <textarea
              className="input-plain textarea-plain"
              value={form.specialInterest}
              onChange={(event) => updateField("specialInterest", event.target.value)}
            />
          </label>

          {formError && <p className="form-error form-span">{formError}</p>}
          {successMessage && <p className="form-success form-span">{successMessage}</p>}

          <div className="form-span report-form-actions">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "กำลังบันทึก..." : "อัปเดตข้อมูลนักศึกษา"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

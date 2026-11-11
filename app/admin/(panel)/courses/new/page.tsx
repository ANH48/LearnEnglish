import { PageHeader } from "@/components/admin/page-header";
import { CourseForm } from "@/features/courses/course-form";
import { loadCourseFormOptions } from "@/features/courses/course-form-options";
import { requirePermission } from "@/lib/auth/current-staff";

export default async function NewCoursePage() {
  const actor = await requirePermission("course.manage");
  const options = await loadCourseFormOptions(actor);

  return (
    <>
      <PageHeader title="Tạo khóa học" back={{ href: "/admin/courses", label: "Khóa học" }} />
      <CourseForm {...options} />
    </>
  );
}

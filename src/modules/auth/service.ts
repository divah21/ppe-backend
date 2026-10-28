import bcrypt from 'bcryptjs';
import type { Row } from '../../core/db';
import { models } from '../../core/db';

/** The signed-in user as the v2 frontend sees it. */
export const toMe = (user: Row) => {
  const employee = user.employee;
  const section = employee?.section;
  return {
    id: user.id as string,
    username: user.username as string,
    name: employee ? `${employee.firstName} ${employee.lastName}` : (user.username as string),
    role: user.role?.name as string,
    roleLabel: (user.role?.description as string | null) ?? null,
    mustChangePassword: !!user.mustChangePassword,
    departmentId: (user.departmentId ?? section?.departmentId ?? null) as string | null,
    sectionId: (user.sectionId ?? employee?.sectionId ?? null) as string | null,
    employee: employee
      ? {
          id: employee.id as string,
          worksNumber: employee.worksNumber as string,
          jobTitle: (employee.jobTitleRef?.name ?? employee.jobTitle ?? null) as string | null,
          section: section ? { id: section.id as string, name: section.name as string } : null,
          department: section?.department
            ? { id: section.department.id as string, name: section.department.name as string }
            : null,
        }
      : null,
    lastLogin: user.lastLogin ?? null,
  };
};

export type Me = ReturnType<typeof toMe>;

/** Returns the user only when the password matches; no hint about which part was wrong. */
// Unknown usernames still pay for a bcrypt compare, so response time does not reveal which accounts exist
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export const verifyCredentials = async (username: string, password: string): Promise<Row | null> => {
  const user = await models.User.findOne({ where: { username } });
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    return null;
  }
  return (await user.verifyPassword(password)) ? user : null;
};

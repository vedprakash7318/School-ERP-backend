export const getSchoolId = (req) => {
  const school = req.user?.school;
  if (school && school._id) return school._id;
  if (school) return school;
  return req.user?.schoolId || null;
};

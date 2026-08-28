"use client";

import PeopleManager from "@/components/PeopleManager";

// Adding/editing/removing interns is common to Admin and HR.
export default function InternsSection() {
  return (
    <PeopleManager
      heading="Interns"
      addButtonLabel="Add intern"
      roleOptions={["Intern"]}
      filterPredicate={(emp) => emp.role === "Intern"}
    />
  );
}

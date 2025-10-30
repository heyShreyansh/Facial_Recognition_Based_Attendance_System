async function createTeacher(data, token) {
  const res = await fetch('/api/admin/teachers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Failed to create teacher (status ${res.status}) ${JSON.stringify(body)}`);
  }
  return res.json();
}
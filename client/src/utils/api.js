/**
 * Safe fetch helper that handles non-JSON responses (such as 504 proxy errors,
 * 404 HTML fallback pages, or server stack traces) gracefully without throwing
 * 'Failed to execute json on Response' syntax errors.
 */
export async function safeFetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      // If HTML or non-JSON returned, wrap in error object
      data = {
        error: res.status === 504 || res.status === 502
          ? 'Backend server is offline or unreachable. Please start the server.'
          : (res.status === 404 ? 'API endpoint not found (404).' : `Server error (${res.status})`)
      };
    }

    if (!res.ok) {
      const errorMessage = data?.error || `Request failed with status ${res.status}`;
      const err = new Error(errorMessage);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('json')) {
      throw new Error('Server returned non-JSON response. Please ensure the backend server is running on port 5000.');
    }
    throw err;
  }
}

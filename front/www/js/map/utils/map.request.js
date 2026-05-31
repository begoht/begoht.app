/*************************************************
 * 🌐 FETCH SEGURO
 *************************************************/
export async function fetchSeguro(url, signal) {

  try {

    const res = await fetch(url, { signal });

    const text = await res.text();

    let data;

    try {

      data = JSON.parse(text);

    } catch {

      console.error(
        "❌ Respuesta NO JSON:",
        text.slice(0, 200)
      );

      return null;
    }

    if (!res.ok) {

      console.error(
        "❌ HTTP:",
        res.status,
        data
      );

      return null;
    }

    return data;

  } catch (err) {

    if (err.name === "AbortError") {
      return null;
    }

    console.error("❌ Fetch:", err.message);

    return null;
  }
}
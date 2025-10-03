
const normHeader = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, "")

const isRowEmpty = (row = []) => row.every((c) => c === '' || c === null || typeof c === 'undefined');


export function validateExcelData (jsonData) {
    const errors = []

    if(!Array.isArray(jsonData) || jsonData.length === 0) {
        errors.push("sheet is either empty or unreadable")
    }

    const headers = (jsonData[0] || []).map((h) => String(h || '').trim());

    const targetHeaderNames = [
        "ABCID",
        "ABC_ID",
        "abcid",
        "ABCACCOUNTID",
        "ABC_ACCOUNT_ID",
        "ABC ACCOUNT ID"
    ].map(normHeader)

    const abcIndex = headers.findIndex((h) => targetHeaderNames.includes(normHeader(h)));

    if(abcIndex === -1) {
        errors.push(
            `Required column "ABCID" not found. Try one of: ABCID, ABC_ACCOUNT_ID, ABC ACCOUNT ID.`
          );
          return { errors };
    }

    for(let i = 1 ; i<jsonData.length; i++) {
        const row = jsonData[i]

        if(isRowEmpty(row)) continue;

        const cellRow = row[abcIndex]

        const label = `Row ${i+1}`

        if (cellRow === "" || cellRow === null || typeof cellRow === "undefined") {
            errors.push(`${label}: ABCID is missing.`);
            continue;
        }

        let value = String(cellRow).trim()

        if(typeof cellRow === 'number') {
            value = Math.trunc(cellRow).toString();
        }

        value = value.replace(/\s+/g, '');

        const sciMatch = value.match(/^(\d+(?:\.\d+)?)E\+?(\d+)$/i);

        if (sciMatch) {
        // Expand the scientific notation roughly (safe for 12-digit IDs)
        const [_, mantissa, expStr] = sciMatch;
        const exp = parseInt(expStr, 10);
        const digits = mantissa.replace(".", "");
        const pad = Math.max(exp - (digits.length - 1), 0);
        value = digits + "0".repeat(pad);
        }

        if (!/^\d{12}$/.test(value)) {
            errors.push(
              `${label}: ABCID must be exactly 12 digits. Found "${value}".`
            );
        }
    
    }

    return { errors, columnIndex: abcIndex };

}
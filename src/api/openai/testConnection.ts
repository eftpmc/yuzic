export const testConnection = async (apiKey: string): Promise<boolean> => {
    try {
        const res = await fetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${apiKey}` },
        });

        return res.ok;
    } catch {
        return false;
    }
};

function detectFieldChanges(previous, current) {
    const changes = [];

    const fields = [
        {
            field: "deadline",
            patterns: [
                /admission\s+deadline\s*:\s*(.+)/i,
                /deadline\s*:\s*(.+)/i
            ]
        },
        {
            field: "applicationFee",
            patterns: [
                /application\s+fee\s*:\s*(.+)/i,
                /application\s+fees\s*:\s*(.+)/i
            ]
        },
        {
            field: "tuitionFee",
            patterns: [
                /tuition\s+fee\s*:\s*(.+)/i,
                /tuition\s+fees\s*:\s*(.+)/i
            ]
        },
        {
            field: "entryTest",
            patterns: [
                /entry\s+test\s*:\s*(.+)/i,
                /entry\s+test\s+requirement\s*:\s*(.+)/i
            ]
        }
    ];

    for (const item of fields) {
        const previousMatch = findMatch(previous, item.patterns);
        const currentMatch = findMatch(current, item.patterns);

        if (
            previousMatch &&
            currentMatch &&
            previousMatch !== currentMatch
        ) {
            changes.push({
                field: item.field,
                previousValue: previousMatch,
                currentValue: currentMatch
            });
        }
    }

    return changes;
}

function findMatch(text, patterns) {
    for (const pattern of patterns) {
        const match = text.match(pattern);

        if (match) {
            return match[1].trim();
        }
    }

    return null;
}

module.exports = {
    detectFieldChanges
};

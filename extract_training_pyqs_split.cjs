const fs = require('fs');
const path = require('path');

// Read database
const dbContent = fs.readFileSync(path.join(__dirname, 'src/constants/pyqDatabase.js'), 'utf-8');

let pyqData = [];
try {
    const arrayStart = dbContent.indexOf('[');
    const arrayEnd = dbContent.lastIndexOf(']') + 1;
    const arrayStr = dbContent.substring(arrayStart, arrayEnd);
    pyqData = new Function("return " + arrayStr)();
} catch (e) {
    console.error("Failed to parse pyqDatabase.js:", e);
    process.exit(1);
}

const currentYear = 2024;

const subjectsConfig = [
    { 
        name: 'Economy', 
        years: 5, 
        matchFn: q => (q.subject || '').toLowerCase().includes('economy') 
    },
    { 
        name: 'Science & Technology', 
        years: 5, 
        filename: 'Science_and_Technology',
        matchFn: q => (q.subject || '').toLowerCase().includes('science') 
    },
    { 
        name: 'Environment', 
        years: 5, 
        matchFn: q => {
            const s = (q.subject || '').toLowerCase();
            return s.includes('environment') || s.includes('ecology');
        }
    },
    { 
        name: 'Polity', 
        years: 10, 
        matchFn: q => (q.subject || '').toLowerCase().includes('polity') 
    },
    { 
        name: 'History', 
        years: 10, 
        matchFn: q => {
            const s = (q.subject || '').toLowerCase();
            const t = (q.topic || '').toLowerCase();
            return s.includes('history') && !t.includes('art and culture') && !t.includes('art & culture');
        }
    },
    { 
        name: 'Art & Culture', 
        years: 10, 
        filename: 'Art_and_Culture',
        matchFn: q => {
            const s = (q.subject || '').toLowerCase();
            const t = (q.topic || '').toLowerCase();
            return t.includes('art and culture') || t.includes('art & culture') || s.includes('art') || s.includes('culture');
        }
    },
    { 
        name: 'Geography', 
        years: 10, 
        matchFn: q => (q.subject || '').toLowerCase().includes('geography') 
    }
];

const outputDir = path.join(__dirname, 'training_data_by_subject');
if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir, { recursive: true });
}

let totalCount = 0;

subjectsConfig.forEach(subject => {
    let outputMd = `# Training Data: ${subject.name}\n\n`;
    outputMd += `This document contains strictly tagged Previous Year Questions for ${subject.name} from the last ${subject.years} years.\n\n`;
    
    const minYear = currentYear - subject.years + 1;
    
    const subjectQ = pyqData.filter(q => {
        const qYear = parseInt(q.year);
        if (isNaN(qYear) || qYear < minYear) return false;
        return subject.matchFn(q);
    });

    if (subjectQ.length === 0) {
        outputMd += `*No questions found matching criteria for this subject.*\n\n`;
    } else {
        const byTopic = {};
        subjectQ.forEach(q => {
            const t = q.topic || 'General';
            if (!byTopic[t]) byTopic[t] = [];
            byTopic[t].push(q);
        });

        Object.keys(byTopic).sort().forEach(topicName => {
            outputMd += `## Topic: ${topicName}\n\n`;
            
            byTopic[topicName].sort((a, b) => parseInt(b.year) - parseInt(a.year)).forEach((q, index) => {
                totalCount++;
                outputMd += `### Question [${q.year}]\n`;
                outputMd += `**[TAGS]**\n`;
                outputMd += `- **Target Exam:** UPSC CSE\n`;
                outputMd += `- **Year:** ${q.year}\n`;
                outputMd += `- **Subject:** ${q.subject || subject.name}\n`;
                outputMd += `- **Topic:** ${q.topic || 'General'}\n`;
                outputMd += `- **Difficulty:** ${q.difficulty || 'Hard'}\n\n`;
                outputMd += `**[QUESTION]**\n${q.text}\n\n`;
                outputMd += `**[OPTIONS]**\n`;
                q.options.forEach((opt, i) => {
                    const letter = String.fromCharCode(65 + i); 
                    outputMd += `${letter}. ${opt}\n`;
                });
                outputMd += `\n**[CORRECT_ANSWER]**\n${q.correctAnswer}\n\n`;
                if (q.explanation) outputMd += `**[EXPLANATION]**\n${q.explanation}\n`;
                outputMd += `\n---\n\n`;
            });
        });
    }

    const fileName = `${subject.filename || subject.name}_Last_${subject.years}_Years.md`.replace(/ /g, '_');
    const outputPath = path.join(outputDir, fileName);
    fs.writeFileSync(outputPath, outputMd);
    console.log(`Wrote ${subjectQ.length} questions to ${fileName}`);
});

console.log(`\nSuccessfully finalized all subject files in /training_data_by_subject/ directory. Total questions processed: ${totalCount}`);

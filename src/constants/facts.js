export const TOPIC_FACTS = {
    'Polity': [
        "The Constitution of India is the longest written constitution of any country on Earth.",
        "The original copies of the Constitution are kept in helium-filled cases in the Library of the Parliament of India.",
        "Dr. B.R. Ambedkar aimed for the Constitution to be a dynamic document, capable of evolving with the nation.",
        "The Preamble was inspired by the US Constitution but unique in its declaration of a Sovereign, Socialist, Secular, Democratic Republic.",
        "Article 21 (Protection of Life and Personal Liberty) has been interpreted most broadly by the Supreme Court.",
    ],
    'History': [
        "The Indus Valley Civilization had the world's first known urban sanitation systems.",
        "Samudragupta is known as the 'Napoleon of India' for his military conquests.",
        "The Chola dynasty possessed one of the strongest navies in ancient world history.",
        "The revolt of 1857 is often described as the First War of Indian Independence.",
        "Ashoka gave up war after the Battle of Kalinga and embraced Buddhism.",
    ],
    'Economy': [
        "India was the world's largest economy for most of the two millennia from the 1st until the 19th century.",
        "The 'Green Revolution' transformed India from a food-deficient nation to a leading agricultural power.",
        "GST (Goods and Services Tax) is one of the biggest indirect tax reforms in independent India.",
        "The Reserve Bank of India was conceptualized based on the guidelines presented by Dr. Ambedkar.",
    ],
    'Geography': [
        "India constitutes only 2.4% of the world's land area but supports over 17% of the world's population.",
        "Mawsynram in Meghalaya is the wettest place on Earth.",
        "The Himalayas are the youngest fold mountains in the world and are still rising.",
        "India has the largest postal network in the world with over 1,55,015 post offices.",
    ],
    'Environment': [
        "India is home to 70% of the world's tiger population.",
        "The Western Ghats are older than the Himalayas and are a UNESCO World Heritage Site.",
        "India was the first country in the world to insert a specific provision for environment protection in its Constitution.",
    ],
    'Science': [
        "India was the first country to reach Mars orbit on its first attempt (Mangalyaan).",
        "Zero was invented by the Indian mathematician Aryabhata.",
        "India creates the world's lowest-cost satellites and space missions.",
    ],
    'General': [
        "Consistent practice with mixed difficulty questions improves retention by 40%.",
        "The brain rewires itself when you learn new concepts (Neuroplasticity).",
        "Spaced repetition is the most effective way to move information to long-term memory.",
    ]
};

export const getRandomFact = (topic) => {
    // Normalize topic to match keys
    let key = 'General';
    if (topic) {
        const lowerTopic = topic.toLowerCase();
        if (lowerTopic.includes('polity') || lowerTopic.includes('constitution')) key = 'Polity';
        else if (lowerTopic.includes('history') || lowerTopic.includes('culture')) key = 'History';
        else if (lowerTopic.includes('economy') || lowerTopic.includes('fiscal')) key = 'Economy';
        else if (lowerTopic.includes('geography') || lowerTopic.includes('earth')) key = 'Geography';
        else if (lowerTopic.includes('environment') || lowerTopic.includes('ecology')) key = 'Environment';
        else if (lowerTopic.includes('science') || lowerTopic.includes('tech')) key = 'Science';
    }

    const facts = TOPIC_FACTS[key] || TOPIC_FACTS['General'];
    return facts[Math.floor(Math.random() * facts.length)];
};

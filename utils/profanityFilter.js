const badWords = [
  'fuck', 'shit', 'ass', 'bitch', 'dick', 'pussy', 'cock', 'cunt', 'whore',
  // Add more words as needed
];

export const filterText = (text) => {
  if (!text) return text;
  let filteredText = text.toLowerCase();
  
  badWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    filteredText = filteredText.replace(regex, '*'.repeat(word.length));
  });
  
  return filteredText;
}; 
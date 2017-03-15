/**
 * Created by petersquicciarini on 3/10/17.
 */

const quotes = [
  'The fool speaks, the wise man listens.',
  'Wisdom does not come overnight.',
  'A man who uses force is afraid of reasoning. ',
  'To get lost is to learn the way.',
  'If you close your eyes to facts, you will learn through accidents.',
  'You learn how to cut down trees by cutting them down.',
  'By the time the fool has learned the game, the players have dispersed.',
  'Where there are experts there will be no lack of learners.',
  'A fight between grasshoppers is a joy to the crow.',
  'When two elephants fight, it is the grass that gets trampled.',
  'An army of sheep led by a lion can defeat an army of lions led by a sheep.',
  'If the cockroach wants to rule over the chicken, then it must hire the fox as a body-guard.',
  'Unity is strength, division is weakness.',
  'Sticks in a bundle are unbreakable.',
  'Two ants do not fail to pull one grasshopper.',
  'A single bracelet does not jingle.',
  'If you want to go quickly, go alone. If you want to go far, go together.',
  'A small house will hold a hundred friends.',
  'Bad friends will prevent you from having good friends.',
  'It is no shame at all to work for money.',
  'The rich are always complaining.',
  'One who plants grapes by the road side, and one who marries a pretty woman, share the same problem.',
  'The surface of the water is beautiful, but it is no good to sleep on.',
  'Beautiful words don’t put porridge in the pot.',
  'Patience is the key which solves all problems.',
  'Patience can cook a stone.',
  'The food that is in the mouth is not yet in the belly.',
  'Rich people sometimes eat bad food.',
  'The impotent man does not eat spicy foods.',
  'When the leg does not walk, the stomach does not eat.',
  'Cooked food is not sold for goats.',
  'One who eats alone cannot discuss the taste of the food with others.',
  'Words are sweet, but they never take the place of food.',
  'He who does not clean his mouth before breakfast always complains that the food is sour.',
  'Man is like a pepper, till you have chewed it you do not know how hot it is.',
  'A spider’s cobweb isn’t only its sleeping spring but also its food trap.',
  'If you are looking for a fly in your food it means that you are full.',
  'When your luck deserts you, even cold food burns.',
  'They ate our food, and forgot our names.',
  'Only a fool tests the depth of a river with both feet.',
  'He who does not know one thing knows another.',
  'A roaring lion kills no game.',
  'Do not call the forest that shelters you a jungle.',
  'Do not look where you fell, but where you slipped.',
  'Fire and gunpowder do not sleep together.',
  'People should not talk while they are eating or pepper may go down the wrong way.',
];
function getRandomQuote() {
  const random = Math.floor(Math.random() * quotes.length);
  return quotes[random];
}

exports.getRandomQuote = getRandomQuote;

/**
 * Created by petersquicciarini on 3/10/17.
 */

const expect = require('chai').expect;
const quotes = require('../quotes');

describe('quotes', () => {
  describe('#getRandomQuote', () => {
    it('should output a random quote', () => {
      expect(quotes.getRandomQuote).to.not.throw(Error);
      expect(quotes.getRandomQuote()).to.be.a('string');
    });
  });
});

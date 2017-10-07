#!/usr/bin/env ruby

require 'json'
require_relative 'anagram_client'
require 'test/unit'

# capture ARGV before TestUnit Autorunner clobbers it

class TestCases < Test::Unit::TestCase

  # runs before each test
  def setup
    @client = AnagramClient.new(ARGV)

    # delete everything
    @client.delete('/words.json') rescue nil
  end

  # runs after each test
  def teardown
  end

  def test_multiple_interactions

    # add all new words, all anagrams of each other

    res = @client.post('/words.json', nil, {"words" => ["read", "dear", "dare"] })

    assert_equal('201', res.code, "Unexpected response code")

    body = JSON.parse(res.body)

    assert_equal(3, body['counts']['word'])
    assert_equal(2, body['counts']['anagram'])

    # add more new words, some anagrams of each other

    res = @client.post('/words.json', nil, {"words" => ["Canadas", "acandas", "scandaa", "Zoidberg"] })

    assert_equal('201', res.code, "Unexpected response code")

    body = JSON.parse(res.body)

    assert_equal(4, body['counts']['word'])
    assert_equal(2, body['counts']['anagram'])

    # add more new words, some anagrams of each other, one already added

    res = @client.post('/words.json', nil, {"words" => ["Acer", "read", "acre", "crea", "race", "care", "Asher", "shear"] })

    assert_equal('201', res.code, "Unexpected response code")

    body = JSON.parse(res.body)

    assert_equal(7, body['counts']['word'])
    assert_equal(5, body['counts']['anagram'])

    # add words, all already added

    res = @client.post('/words.json', nil, {"words" => ["Acer", "read", "crea"] })

    assert_equal('204', res.code, "Unexpected response code")

    # add new invalid word

    res = @client.post('/words.json', nil, {"words" => ["hunter2"] })

    assert_equal('204', res.code, "Unexpected response code")

    # add lowercase version of previously-added proper noun

    res = @client.post('/words.json', nil, {"words" => ["acer"] })

    assert_equal('201', res.code, "Unexpected response code")

    body = JSON.parse(res.body)

    assert_equal(1, body['counts']['word'])
    assert_equal(1, body['counts']['anagram'])

    # add previously-added proper noun

    res = @client.post('/words.json', nil, {"words" => ["Acer"] })

    assert_equal('204', res.code, "Unexpected response code")

    # get anagrams
    
    res = @client.get('/anagrams/read.json')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_not_nil(body['anagrams'])

    expected_anagrams = %w(dare dear)
    assert_equal(expected_anagrams, body['anagrams'].sort)

    # get anagrams for an invalid word
    
    res = @client.get('/anagrams/hunter2.json')

    assert_equal('400', res.code, "Unexpected response code")

    # get anagrams
    
    res = @client.get('/anagrams/dear.json')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_not_nil(body['anagrams'])

    expected_anagrams = %w(dare read)
    assert_equal(expected_anagrams, body['anagrams'].sort)

    # get anagrams, including input
    
    res = @client.get('/anagrams/dear.json?includeInput=true')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_not_nil(body['anagrams'])

    expected_anagrams = %w(dare dear read)
    assert_equal(expected_anagrams, body['anagrams'].sort)

    # get anagrams for proper noun
    
    res = @client.get('/anagrams/Canadas.json')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_not_nil(body['anagrams'])

    expected_anagrams = %w(acandas scandaa)
    assert_equal(expected_anagrams, body['anagrams'].sort)

    # get anagrams
    
    res = @client.get('/anagrams/acandas.json')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_not_nil(body['anagrams'])

    expected_anagrams = %w(Canadas scandaa)
    assert_equal(expected_anagrams, body['anagrams'].sort)

    # get anagrams using lowercase word to match proper noun
    
    res = @client.get('/anagrams/canadas.json')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_not_nil(body['anagrams'])

    expected_anagrams = %w(Canadas acandas scandaa)
    assert_equal(expected_anagrams, body['anagrams'].sort)

    # get anagrams using lowercase word to match proper noun, including input
    
    res = @client.get('/anagrams/canadas.json?includeInput=true')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_not_nil(body['anagrams'])

    expected_anagrams = %w(Canadas acandas scandaa)
    assert_equal(expected_anagrams, body['anagrams'].sort)

    # get anagrams for proper noun, including input
    
    res = @client.get('/anagrams/Canadas.json?includeInput=true')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_not_nil(body['anagrams'])

    expected_anagrams = %w(Canadas acandas scandaa)
    assert_equal(expected_anagrams, body['anagrams'].sort)

    # get anagrams for lowercase word for which there is both a lowercase and proper noun match
    
    res = @client.get('/anagrams/acer.json')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_not_nil(body['anagrams'])

    expected_anagrams = %w(Acer acre care crea race)
    assert_equal(expected_anagrams, body['anagrams'].sort)

    # get anagrams for proper noun for which there is both a lowercase and proper noun match
    
    res = @client.get('/anagrams/Acer.json')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_not_nil(body['anagrams'])

    expected_anagrams = %w(acer acre care crea race)
    assert_equal(expected_anagrams, body['anagrams'].sort)

    # get anagrams for proper noun for which there is both a lowercase and proper noun match, including input
    
    res = @client.get('/anagrams/acer.json?includeInput=true')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_not_nil(body['anagrams'])

    expected_anagrams = %w(Acer acer acre care crea race)
    assert_equal(expected_anagrams, body['anagrams'].sort)

    # get anagrams for lowercase word for which there is both a lowercase and proper noun match, excluding proper nouns
    
    res = @client.get('/anagrams/acer.json?excludeProperNouns=true')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_not_nil(body['anagrams'])

    expected_anagrams = %w(acre care crea race)
    assert_equal(expected_anagrams, body['anagrams'].sort)

    # get anagrams for lowercase word for which there is both a lowercase and proper noun match, excluding proper nouns and including input (includeInput overrides excludeProperNouns)
    
    res = @client.get('/anagrams/Acer.json?excludeProperNouns=true&includeInput=true')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_not_nil(body['anagrams'])

    expected_anagrams = %w(Acer acer acre care crea race)
    assert_equal(expected_anagrams, body['anagrams'].sort)

    # get anagrams for lowercase word for which there is both a lowercase and proper noun match, limiting output to 2
    
    res = @client.get('/anagrams/acer.json?limit=2')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_not_nil(body['anagrams'])

    expected_anagrams = %w(Acer acre)
    assert_equal(expected_anagrams, body['anagrams'].sort)

    # get anagrams for lowercase word for which there is both a lowercase and proper noun match, excluding proper nouns and limiting output to 2
    
    res = @client.get('/anagrams/acer.json?excludeProperNouns=true&limit=2')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_not_nil(body['anagrams'])

    expected_anagrams = %w(acre crea)
    assert_equal(expected_anagrams, body['anagrams'].sort)

    # get anagrams for word that is NOT in the dictionary but for which anagrams exist in the dictionary
    
    res = @client.get('/anagrams/share.json')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(0, body['anagrams'].size)

    # get anagram sets with minimum cardinality of 4
    
    res = @client.get('/anagrams?cardinalityMin=4')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(4, body['anagramsByCardinality']['cardinalityMin'])
    assert_equal(1, body['anagramsByCardinality']['anagrams'].size)

    expected_anagrams = %w(Acer acer acre care crea race)
    assert_equal(expected_anagrams, body['anagramsByCardinality']['anagrams'][0].sort)

    # get anagram sets with maximum cardinality of 2
    
    res = @client.get('/anagrams?cardinalityMax=2')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(2, body['anagramsByCardinality']['cardinalityMax'])
    assert_equal(1, body['anagramsByCardinality']['anagrams'].size)

    expected_anagrams = %w(Asher shear)
    assert_equal(expected_anagrams, body['anagramsByCardinality']['anagrams'][0].sort)

    # get anagram sets with minimum word length of 7
    
    res = @client.get('/anagrams?lengthMin=7')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(7, body['anagramsByLength']['lengthMin'])
    assert_equal(1, body['anagramsByLength']['anagrams'].size)

    expected_anagrams = %w(Canadas acandas scandaa)
    assert_equal(expected_anagrams, body['anagramsByLength']['anagrams'][0].sort)

    # add lowercase version of previously-added proper noun

    res = @client.post('/words.json', nil, {"words" => ["zoidberg"] })

    assert_equal('201', res.code, "Unexpected response code")

    body = JSON.parse(res.body)

    assert_equal(1, body['counts']['word'])
    assert_equal(1, body['counts']['anagram'])

    # get anagram sets with minimum word length of 7
    
    res = @client.get('/anagrams?lengthMin=7')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(7, body['anagramsByLength']['lengthMin'])
    assert_equal(2, body['anagramsByLength']['anagrams'].size)

    expected_anagrams = %w(Canadas acandas scandaa)
    assert_equal(expected_anagrams, body['anagramsByLength']['anagrams'][0].sort)

    expected_anagrams = %w(Zoidberg zoidberg)
    assert_equal(expected_anagrams, body['anagramsByLength']['anagrams'][1].sort)

    # get anagram sets with maximum word length of 2
    
    res = @client.get('/anagrams?lengthMax=2')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(2, body['anagramsByLength']['lengthMax'])
    assert_equal(0, body['anagramsByLength']['anagrams'].size)

    # get anagram sets with maximum cardinality
    
    res = @client.get('/anagrams?maxCardinality=true')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(6, body['maxCardinalityAnagrams']['maxCardinality'])
    assert_equal(1, body['maxCardinalityAnagrams']['anagrams'].size)

    expected_anagrams = %w(Acer acer acre care crea race)
    assert_equal(expected_anagrams, body['maxCardinalityAnagrams']['anagrams'][0].sort)

    # get anagram sets with maximum length
    
    res = @client.get('/anagrams?maxLength=true')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(8, body['maxLengthAnagrams']['maxLength'])
    assert_equal(1, body['maxLengthAnagrams']['anagrams'].size)

    expected_anagrams = %w(Zoidberg zoidberg)
    assert_equal(expected_anagrams, body['maxLengthAnagrams']['anagrams'][0].sort)

    # determine if a set of anagrams are anagrams
    
    res = @client.get('/anagrams?areAnagrams=dare,dear')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(true, body['anagramAffinity']['areAnagrams'])

    # determine if a set of non-anagrams are anagrams
    
    res = @client.get('/anagrams?areAnagrams=dare,dear,rad')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(false, body['anagramAffinity']['areAnagrams'])

    # delete a word

    res = @client.delete('/words/dear.json')

    assert_equal('204', res.code, "Unexpected response code")

    # expect it not to show up in results

    res = @client.get('/anagrams/read.json')

    assert_equal('200', res.code, "Unexpected response code")

    body = JSON.parse(res.body)

    assert_equal(['dare'], body['anagrams'])

    # determine if a set of anagrams are anagrams, but where one of the supplied words is NOT in the dictionary (deleted above)
    
    res = @client.get('/anagrams?areAnagrams=dare,dear,read')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(false, body['anagramAffinity']['areAnagrams'])

    # determine if a null set of words are anagrams
    
    res = @client.get('/anagrams?areAnagrams=')

    assert_equal('400', res.code, "Unexpected response code")

    # get total number of words in the dictionary
    
    res = @client.get('/words?count=true')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(15, body['counts']['word'])

    # get total number of anagrams in the dictionary
    
    res = @client.get('/anagrams?count=true')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(10, body['counts']['anagram'])

    # delete a word

    res = @client.delete('/words/read.json')

    assert_equal('204', res.code, "Unexpected response code")

    # get total number of words in the dictionary
    
    res = @client.get('/words?count=true')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(14, body['counts']['word'])

    # get total number of anagrams in the dictionary
    
    res = @client.get('/anagrams?count=true')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(9, body['counts']['anagram'])

    # delete a word

    res = @client.delete('/words/dare.json')

    assert_equal('204', res.code, "Unexpected response code")

    # get total number of words in the dictionary
    
    res = @client.get('/words?count=true')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(13, body['counts']['word'])

    # get total number of anagrams in the dictionary
    
    res = @client.get('/anagrams?count=true')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(9, body['counts']['anagram'])

    # delete an already-deleted word

    res = @client.delete('/words/dare.json')

    assert_equal('404', res.code, "Unexpected response code")

    # delete a word and all of its anagrams

    res = @client.delete('/words/care.json?includeAnagrams=true')

    assert_equal('204', res.code, "Unexpected response code")

    # get total number of words in the dictionary
    
    res = @client.get('/words?count=true')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(7, body['counts']['word'])

    # get total number of anagrams in the dictionary
    
    res = @client.get('/anagrams?count=true')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(4, body['counts']['anagram'])

    # delete an already-deleted word and all of its anagrams

    res = @client.delete('/words/care.json?includeAnagrams=true')

    assert_equal('404', res.code, "Unexpected response code")

    # delete a word

    res = @client.delete('/words/scandaa.json')

    assert_equal('204', res.code, "Unexpected response code")

    # delete an already-deleted word and all of its anagrams, where anagrams exist for the word

    res = @client.delete('/words/scandaa.json?includeAnagrams=true')

    assert_equal('404', res.code, "Unexpected response code")

    # confirm last delete did nothing
    
    res = @client.get('/anagrams/acandas.json')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_not_nil(body['anagrams'])

    expected_anagrams = %w(Canadas)
    assert_equal(expected_anagrams, body['anagrams'])

    # clear dictionary

    res = @client.delete('/words.json')

    assert_equal('204', res.code, "Unexpected response code")

    # should fetch an empty body

    res = @client.get('/anagrams/read.json')

    assert_equal('200', res.code, "Unexpected response code")

    body = JSON.parse(res.body)

    assert_equal(0, body['anagrams'].size)

    # get total number of words in the dictionary
    
    res = @client.get('/words?count=true')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(0, body['counts']['word'])

    # get total number of anagrams in the dictionary
    
    res = @client.get('/anagrams?count=true')

    assert_equal('200', res.code, "Unexpected response code")
    assert_not_nil(res.body)

    body = JSON.parse(res.body)

    assert_equal(0, body['counts']['anagram'])

  end
end

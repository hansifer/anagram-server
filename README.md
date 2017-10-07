Anagram Server
=========

Anagram Server is a Node.js-based application that exposes a REST-based API for conducting [anagram](https://en.wikipedia.org/wiki/Anagram)-related searches against a dictionary of words. Its primary feature is to find known anagrams for a given word. 

In addition, anagram sets (groups of words that are anagrams of each other) can be queried by cardinality (number of words in the set) or word length. It's also possible to query whether a given set of words comprise an anagram set.

The dictionary of words against which anagrams can be queried can be added to, deleted from, or entirely cleared via the API. When configured as a memory-only service (ie, changes not being persisted across service restarts), Anagram Server preloads a standard set of English words upon startup (see `app.js`).

Finally, a number of statistics about the loaded dictionary can be queried via the API.

### Running Natively

1) Install [Node.js](https://nodejs.org/en/) if necessary

2) Install npm dependencies

`npm install`

3) Run the app

`npm start`

*By default, the app serves requests over port 3000. To override this, you can update the start script in `package.json` to pass an alternative port number to the node command. For example:*

`"start": "node src/app.js -p 8080"`

 *You may need to explicitly allow incoming traffic on the effective port. For example, to open port 3000 on Linux until next reboot:*

 `sudo iptables -A INPUT -m state --state NEW -m tcp -p tcp --dport 3000 -j ACCEPT`

### Running As a Docker Image

1) Install [Docker](https://docs.docker.com/engine/installation/) if necessary

2) Build the Docker image

`sudo docker build -t anagram-server .`

3) Run the Docker image

`sudo docker run -p 3000:3000 anagram-server`

*You may prefer to map to an alternative host port (eg, `-p 8080:3000`).*

### Testing

#### Scripts

The Anagram Server ships with [Ruby](https://www.ruby-lang.org/en/) test scripts.

*Note that by default the Anagram Server preloads words from `dictionary.txt` on startup.*

The test scripts are in the `test` subfolder of the source package and can be run individually like so:

`ruby anagram_test.rb`

`ruby anagram_test_2.rb`

#### Ad hoc

Anagram Server can be tested manually with `cURL` or a tool like [Postman](https://www.getpostman.com/postman). For example (from the command line in a new terminal window of the app host):

`curl -i "http://localhost:3000/anagrams/shout.json"`

*Since by default the Anagram Server preloads words from `dictionary.txt` on startup, you may want to clear the dictionary with the following command prior to testing:*

`curl -i -X DELETE "http://localhost:3000/words.json"`

#### IP and Port Settings

For remote testing, replace "localhost" with the app host IP in `anagram_client.rb` and in the sample commands of this document.

Also update the port number in `anagram_client.rb` and in the sample commands if running Anagram Server with a port other than the default (3000).

## Considerations

### Valid Words

A word is considered valid if it contains any combination of uppercase and lowercase English alphabet letters or a hyphen. A valid word may not *start* or *end* with a hyphen.

Attempts to GET or DELETE invalid words result in `400 Bad Request`.

Attempts to POST invalid words result in `204 No Content`.

### Proper Nouns

A proper noun is considered to be any word that has all lowercase letters except for the first letter (which must be uppercase) and the first letter after a hyphen (which may be uppercase or lowercase).

Some examples are: English, Zulu, Jean-Christophe

Proper nouns are considered distinct from their lowercase versions. Eg, **abigail** and **Abigail** are two distinct words (and anagrams of each other).

Proper nouns are always included in results unless explicitly excluded (see `excludeProperNouns` parm of `GET /anagrams/:word.json`).

For convenience, Anagram Server allows matching proper nouns against their lowercase versions in some cases. For example, when querying anagrams:

```{bash}
$ curl -i "http://localhost:3000/anagrams/aaru.json?includeInput=true"

HTTP/1.1 200 OK
Content-Type: application/json
...

{ "anagrams": [
	"Aaru",
	"aura"]
}
```

## Architecture

The Anagram Server architecture consists of 4 layers (from lowest-level to highest):

* Adapter
* AnagramService
* Server
* App

### Adapter

An adapter is a class that provides the basic store-specific querying, iterating, and CRUD operations used by Anagram Server. Specifically, an adapter provides semantics for associating a key string to a set of values, adding to and deleting from the set of values per key, querying for a set by key, and iterating key/set pairs.

The adapter abstracts the specifics of the underlying storage mechanism from the service logic in order to facilitate swapping one storage technology for another. A value of this abstraction is to provide an easy upgrade path as more favorable storage alternatives emerge and to allow for flexible scalability options.

For example, the service may initially be rolled out as a single app server with an adapter that wraps a MySQL instance on the same server. As scalability, failover, and performance needs increase, we might swap the adapter for one that wraps a Redis instance that persists and replicates its data across multiple servers. The specifics of how the data is stored, cached, and/or replicated are transparent to the anagram service.

Anagram Server ships with MemoryAdapter (`adapters/MemoryAdapter.js`), which uses JavaScript's [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) to store and query data. This adapter has limited application since it does not provide the benefit of persistence across server restarts, but it serves as a good foundation for testing and showing off Anagram Server features.

The project defines an interface for implementing adapters in the file `adapters/adapter-template.js`. This file can be used as boilerplate in defining new adapters.

The adapter interface is Promise-based since APIs for storage technologies tend to be asynchronous. Theoretically this adds response time since promises get resolved via the event queue, but this effect is negligible within the scope of a network request.

#### Considerations

**Transactions**

The `add()` and `delete()` methods of the adapter require the underlying store to support transactions since their logic involves querying the data, then operating on the store based on the results of the query.

**Cloning Results**

MemoryAdapter `get()` and `each()` methods return Map value arrays directly to the AnagramService. This requires diligence on behalf of the AnagramService code to avoid accidental mutation of the results furnished by these methods.

Cloning the results within MemoryAdapter before returning them would be a wise step in mitigating future bugs, ensuring interface consistency, and affording [least astonishment](https://en.wikipedia.org/wiki/Principle_of_least_astonishment) to consumers, but also involve additional (albeit likely negligible) overhead.

### AnagramService

AnagramService is a class that provides the business logic for the Anagram Server. It requires an instance of an adapter to be passed to its constructor.

The AnagramService class maintains word and anagram counts and implements methods that directly support the REST API.

This class lives in `AnagramService.js`.

### Server

`server.js` exports a single function `startServer()` that creates the REST server (via [Restify](http://restify.com/)) and instantiates AnagramService.

`startServer()` requires an adapter instance and optionally accepts a port number from which to service requests and an optional path to a text file to prepopulate the dictionary from.

The meat of `server.js` is the set of server response functions that parse individual HTTP requests, call the relevant AnagramService methods, and issue responses with appropriate object wrapping and HTTP response codes.

### App

`app.js` is the entry point for Anagram Server. It's a simple file that specifies the adapter to run the service with and an optional data preload source.

This is the only file that needs to change when swapping one adapter for another.

The current version of `app.js` runs AnagramServer with the MemoryAdapter and preloads `dictionary.txt` on startup.

## TODO

Below are some ideas for further developing Anagram Server.

* **Discovery** Document and publish an API specification (eg, Open API). Use something like Swagger to maintain it.
* **Internationalization** Allow words with letters beyond the English alphabet.
* **Authentication** Require authorization for POST and DELETE operations and allow each login to manage its own anagram dictionary.
* **Throttling** Implement some kind of throttling policy to mitigate server load and hinder DoS attacks.
* **Logging** Log requests and feed them into an analytics engine to identify search trends over time.
* **Monitoring** Set up threshold alarms and a dashboard to monitor usage.
* **UI** Create spiffy web and mobile app front-ends for the API.

## API

### `GET /anagrams/:word.json`

Return a JSON array of words that are anagrams of the word passed in the URL. 

If the passed word itself is not a known word (ie, not in the dictionary), an empty array is returned (even if known anagrams can be formed from the passed word).

For convenience, a word passed as lowercase will match its proper noun form.

Example:

```{bash}
$ curl -i "http://localhost:3000/anagrams/care.json"

HTTP/1.1 200 OK
Content-Type: application/json
...

{ "anagrams": [
	"Acer",
	"acre",
	"crea",
	"race"]
}
```

### `GET /anagrams/:word.json?limit=<integer>`

Return a JSON array of words that are anagrams of the word passed in the URL, *but limit the number of results returned*.

Example:

```{bash}
$ curl -i "http://localhost:3000/anagrams/care.json?limit=2"

HTTP/1.1 200 OK
Content-Type: application/json
...

{ "anagrams": [
	"Acer",
	"acre"]
}
```

### `GET /anagrams/:word.json?includeInput=true`

Return a JSON array of words that are anagrams of the word passed in the URL, *including the input word itself*.

The input word is not normally included in anagram results since a word is not conventionally considered an anagram of itself.

```{bash}
$ curl -i "http://localhost:3000/anagrams/care.json?includeInput=true"

HTTP/1.1 200 OK
Content-Type: application/json
...

{ "anagrams": [
	"Acer",
	"acre",
	"care",
	"crea", 
	"race"]
}
```

### `GET /anagrams/:word.json?excludeProperNouns=true`

Return a JSON array of words that are anagrams of the word passed in the URL, *omitting proper nouns*.

Proper nouns are normally included in anagram results.

```{bash}
$ curl -i "http://localhost:3000/anagrams/care.json?limit=2&excludeProperNouns=true"

HTTP/1.1 200 OK
Content-Type: application/json
...

{ "anagrams": [
	"acre",
	"crea"] 
}
```

### `GET /anagrams?cardinalityMin=<integer>&cardinalityMax=<integer>`

Return all anagram sets that have a minimum and/or maximum cardinality (number of anagrams in the set). 

Either cardinalityMin or cardinalityMax may be omitted.

Examples:

```{bash}
$ curl -i "http://localhost:3000/anagrams?cardinalityMin=3&cardinalityMax=4"

HTTP/1.1 200 OK
Content-Type: application/json
...

{
	"anagramsByCardinality": {
		"cardinalityMin": 3,
		"cardinalityMax": 4,
		"anagrams": [
			["Aaronic", "Nicarao", "ocarina"],
			["abater", "artabe", "eartab", "trabea"],
			["Abe", "bae", "Bea"],
			...
		]
	}
}

# Return all words that have anagrams
$ curl -i "http://localhost:3000/anagrams?cardinalityMin=2"

HTTP/1.1 200 OK
Content-Type: application/json
...

{
	"anagramsByCardinality": {
		"cardinalityMin": 2,
		"anagrams": [
			["A", "a"],
			["aal", "ala"],
			["aam", "ama"],
			...
		]
	}
}
```

### `GET /anagrams?lengthMin=<integer>&lengthMax=<integer>`

Return all anagram sets that have a minimum and/or maximum word length. 

Either lengthMin or lengthMax may be omitted.

Example:

```{bash}
$ curl -i "http://localhost:3000/anagrams?lengthMin=10&lengthMax=11"

HTTP/1.1 200 OK
Content-Type: application/json
...

{
	"anagramsByLength": {
		"lengthMin": 10,
		"lengthMax": 11,
		"anagrams": [
			["ablastemic", "masticable"],
			["aborticide", "bacterioid"],
			["acalyptrate", "Calyptratae"],
			...
		]
	}
}
```

### `GET /anagrams?maxCardinality=true`

Return all anagram sets with the maximum cardinality. 

Example:

```{bash}
$ curl -i "http://localhost:3000/anagrams?maxCardinality=true"

HTTP/1.1 200 OK
Content-Type: application/json
...

{
	"maxCardinalityAnagrams": {
		"maxCardinality": 11,
		"anagrams": [
			["angor", "argon", "goran", "grano", "groan", "nagor", "Orang", "orang", "organ", "rogan", "Ronga"]
		]
	}
}
```

### `GET /anagrams?maxLength=true`

Return all anagram sets with the maximum word length. 

Example:

```{bash}
$ curl -i "http://localhost:3000/anagrams?maxLength=true"

HTTP/1.1 200 OK
Content-Type: application/json
...

{
	"maxLengthAnagrams": {
		"maxLength": 22,
		"anagrams": [
			["cholecystoduodenostomy", "duodenocholecystostomy"],
			["hydropneumopericardium", "pneumohydropericardium"]
		]
	}
}
```

### `GET /anagrams?areAnagrams=<comma-delimited list of words>`

Determine whether a set of words are anagrams of each other. 

All passed words must be known (ie, in the dictionary) in order for this to be true.

Example:

```{bash}
$ curl -i "http://localhost:3000/anagrams?areAnagrams=acer,acre,race"

HTTP/1.1 200 OK
Content-Type: application/json
...

{
	"anagramAffinity": {
		"areAnagrams": true,
		"words": ["acer", "acre", "race"]
	}
}
```

### `GET /anagrams?count=true`

Return anagram counts only. Each set of anagrams in the dictionary adds *n-1* to this count, where *n* is the number of anagrams in the set.

Example:

```{bash}
$ curl -i "http://localhost:3000/anagrams?count=true"

HTTP/1.1 200 OK
Content-Type: application/json
...

{ "counts": { "anagram": 20043 }}
```

### `GET /words?count=true`

Return number of words in the dictionary.

Example:

```{bash}
$ curl -i "http://localhost:3000/words?count=true"

HTTP/1.1 200 OK
Content-Type: application/json
...

{ "counts": { "word": 235886 }}
```

### `GET /words?stats=true`

Return some statistics about the words in the dictionary.

Example:

```{bash}
$ curl -i "http://localhost:3000/words?stats=true"

HTTP/1.1 200 OK
Content-Type: application/json
...

{
	"stats": {
		"wordCount": 235886,
		"anagramCount": 20043,
		"minWordLength": 1,
		"maxWordLength": 24,
		"medianWordLength": 4,
		"averageWordLength": 9.569126612007494,
		"minCardinality": 2,
		"maxCardinality": 11,
		"medianCardinality": 2,
		"averageCardinality": 2.3111140184470464
	}
}
```

### `POST /words.json`

Takes a JSON array of words and adds them to the dictionary.

Example:

```{bash}
$ curl -i -X POST -d '{ "words": ["Canadas", "acandas", "Smurfs", "care"] }' "http://localhost:3000/words.json"

HTTP/1.1 201 Created
Content-Type: application/json
...

{
	"counts": {
		"word": 3,
		"anagram": 1
	},
	"words": ["/anagrams/Canadas", "/anagrams/acandas", "/anagrams/Smurfs"]
}
```

### `DELETE /words/:word.json`

Delete a single word from the dictionary.

If the passed word itself is not a known word (ie, not in the dictionary), a `404` is returned.

Example:

```{bash}
$ curl -i -X DELETE "http://localhost:3000/words/care.json"

HTTP/1.1 204 No Content
...
```

### `DELETE /words/:word.json?includeAnagrams=true`

Delete a single word *and all of its anagrams* from the dictionary.

If the passed word itself is not a known word (ie, not in the dictionary), nothing is deleted and a `404` is returned.

Example:

```{bash}
$ curl -i -X DELETE "http://localhost:3000/words/acre.json?includeAnagrams=true"

HTTP/1.1 204 No Content
...
```

### `DELETE /words.json`

Clear all contents from the dictionary.

Example:

```{bash}
$ curl -i -X DELETE "http://localhost:3000/words.json"

HTTP/1.1 204 No Content
...
```

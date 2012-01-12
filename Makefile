IN := src/main.js src/event-emitter.js src/core/*.js src/sinks/*.js src/utils/*.js src/extra/*.js
OUT := sink.js
DOCS := DOCS.md
BUILD := ./build
LIGHT_IN := src/main.js src/event-emitter.js src/core/*.js src/sinks/web-audio-api.js src/audio-data-api.js
LIGHT_OUT := sink-light.js

UPDATE := $(BUILD) update
CAT := cat

all: $(OUT)
light: $(LIGHT_OUT)
docs: $(DOCS)


$(OUT): $(IN)
	$(CAT) $^ > $@

$(DOCS): $(BUILD) $(OUT)
	$(UPDATE) docs

$(LIGHT_OUT): $(LIGHT_IN)
	$(CAT) $^ > $@


clean:
	rm $(OUT) $(LIGHT_OUT) $(DOCS) -rf

.PHONY: all light docs clean

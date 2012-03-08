IN := src/main.js src/event-emitter.js src/core/*.js src/sinks/*.js src/utils/*.js src/extra/*.js
OUT := sink.js
DOCS := DOCS.md
BUILD := ./build
LIGHT_IN := src/main.js src/event-emitter.js src/core/*.js src/sinks/web-audio-api.js src/sinks/audio-data-api.js
LIGHT_OUT := sink-light.js
RELEASE_TAR_GZ := sink.js.tar.gz
RELEASE_ZIP := sink.js.zip

UPDATE := $(BUILD) update
CAT := cat

all: $(OUT)
light: $(LIGHT_OUT)
docs: $(DOCS)
release: $(RELEASE_TAR_GZ) $(RELEASE_ZIP)


$(OUT): $(IN)
	$(CAT) $^ > $@

$(DOCS): $(BUILD) $(OUT)
	$(UPDATE) docs

$(LIGHT_OUT): $(LIGHT_IN)
	$(CAT) $^ > $@

$(RELEASE_TAR_GZ): $(OUT) $(LIGHT_OUT)
	rm -rf $@
	tar pczf $@ $^

$(RELEASE_ZIP): $(OUT) $(LIGHT_OUT)
	rm -rf $@
	zip $@ $^


clean:
	rm $(OUT) $(LIGHT_OUT) $(DOCS) $(RELEASE_TAR_GZ) $(RELEASE_ZIP) -rf

.PHONY: all light docs clean

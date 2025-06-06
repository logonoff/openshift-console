package utils

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"strings"

	"k8s.io/klog/v2"

	"github.com/openshift/console/pkg/serverconfig"
)

const (
	baseURI       = "base-uri"
	defaultSrc    = "default-src"
	imgSrc        = "img-src"
	fontSrc       = "font-src"
	scriptSrc     = "script-src"
	styleSrc      = "style-src"
	objectSrc     = "object-src"
	connectSrc    = "connect-src"
	consoleDot    = "console.redhat.com"
	httpLocalHost = "http://localhost:8080"
	wsLocalHost   = "ws://localhost:8080"
	self          = "'self'"
	data          = "data:"
	unsafeEval    = "'unsafe-eval'"
	unsafeInline  = "'unsafe-inline'"
	none          = "'none'"
)

// Generate a cryptographically secure random array of bytes.
func RandomBytes(length int) ([]byte, error) {
	bytes := make([]byte, length)
	_, err := rand.Read(bytes)
	return bytes, err
}

// Generate a cryptographically secure random string.
// Returned string is encoded using [encoding.RawURLEncoding]
// which makes it safe to use in URLs and file names.
func RandomString(length int) (string, error) {
	encoding := base64.RawURLEncoding
	// each byte (8 bits) gives us 4/3 base64 (6 bits) characters,
	// we account for that conversion and add one to handle truncation
	b64size := encoding.DecodedLen(length) + 1
	randomBytes, err := RandomBytes(b64size)
	if err != nil {
		return "", err
	}
	// trim down to the original requested size since we added one above
	return encoding.EncodeToString(randomBytes)[:length], nil
}

// buildCSPDirectives takes the content security policy configuration from the server and constructs
// a complete set of directives for the Content-Security-Policy-Report-Only header.
// The constructed directives will include the default sources and the supplied configuration.
func BuildCSPDirectives(k8sMode string, pluginsCSP serverconfig.MultiKeyValue, indexPageScriptNonce string, cspReportingEndpoint string) ([]string, error) {
	nonce := fmt.Sprintf("'nonce-%s'", indexPageScriptNonce)

	// The default sources are the sources that are allowed for all directives.
	// When running on-cluster, the default sources are just 'self' and 'console.redhat.com'.
	// When running off-cluster, 'http://localhost:8080' and 'ws://localhost:8080' are appended to the
	// default sources. Image source, font source, and style source only use 'self' and
	// 'http://localhost:8080'.
	baseUriDirective := []string{baseURI, self}
	defaultSrcDirective := []string{defaultSrc, self, consoleDot}
	imgSrcDirective := []string{imgSrc, self}
	fontSrcDirective := []string{fontSrc, self}
	scriptSrcDirective := []string{scriptSrc, self, consoleDot}
	styleSrcDirective := []string{styleSrc, self}
	objectSrcDirective := []string{objectSrc, self}
	connectSrcDirective := []string{connectSrc, self, consoleDot}

	// If running off-cluster, append the localhost sources to the default sources
	if k8sMode == "off-cluster" {
		baseUriDirective = append(baseUriDirective, []string{httpLocalHost, wsLocalHost}...)
		defaultSrcDirective = append(defaultSrcDirective, []string{httpLocalHost, wsLocalHost}...)
		imgSrcDirective = append(imgSrcDirective, httpLocalHost)
		fontSrcDirective = append(fontSrcDirective, httpLocalHost)
		scriptSrcDirective = append(scriptSrcDirective, []string{httpLocalHost, wsLocalHost}...)
		styleSrcDirective = append(styleSrcDirective, httpLocalHost)
		objectSrcDirective = append(objectSrcDirective, httpLocalHost)
		connectSrcDirective = append(connectSrcDirective, httpLocalHost)
	}

	// If the plugins are providing a content security policy configuration, parse it and add it to
	// the appropriate directive. The configuration is a string that is parsed into a map of directive types to sources.
	// The sources are added to the existing sources for each type.
	for directive, sources := range pluginsCSP {
		switch directive {
		case defaultSrc:
			defaultSrcDirective = append(defaultSrcDirective, sources)
		case imgSrc:
			imgSrcDirective = append(imgSrcDirective, sources)
		case fontSrc:
			fontSrcDirective = append(fontSrcDirective, sources)
		case scriptSrc:
			scriptSrcDirective = append(scriptSrcDirective, sources)
		case styleSrc:
			styleSrcDirective = append(styleSrcDirective, sources)
		case connectSrc:
			connectSrcDirective = append(connectSrcDirective, sources)
		default:
			klog.Fatalf("invalid CSP directive: %s", directive)
		}
	}

	imgSrcDirective = append(imgSrcDirective, data)
	fontSrcDirective = append(fontSrcDirective, data)
	scriptSrcDirective = append(scriptSrcDirective, []string{unsafeEval, nonce}...)
	styleSrcDirective = append(styleSrcDirective, unsafeInline)

	// Construct the full list of directives from the aggregated sources.
	// This array is a list of directives, where each directive is a string
	// of the form "<directive-type> <sources>".
	// The sources are concatenated together with a space separator.
	// The CSP directives string is returned as a slice of strings, where each string is a directive.
	resultDirectives := []string{
		strings.Join(baseUriDirective, " "),
		strings.Join(defaultSrcDirective, " "),
		strings.Join(imgSrcDirective, " "),
		strings.Join(fontSrcDirective, " "),
		strings.Join(scriptSrcDirective, " "),
		strings.Join(styleSrcDirective, " "),
		strings.Join(connectSrcDirective, " "),
		strings.Join(objectSrcDirective, " "),
		"frame-src 'none'",
		"frame-ancestors 'none'",
	}

	// Support using client provided CSP reporting endpoint for testing purposes.
	if cspReportingEndpoint != "" {
		resultDirectives = append(resultDirectives, fmt.Sprintf("report-uri %s", cspReportingEndpoint))
	}

	return resultDirectives, nil
}

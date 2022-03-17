# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.5.0] - 2022-03-17

### Added

- Send user's IP address with metrics. Used for visualization aggregate geolocation data.
  The IP is never stored, and it is never sent to 3rd parties.

## [1.4.1] - 2022-02-20

### Added

- Add platform name to sent Apilytics version info.

## [1.4.0] - 2022-02-15

### Added

- Send current system CPU usage together with metrics.
- Send current system memory usage and total available memory together with metrics.

## [1.3.0] - 2022-02-02

### Added

- Send `User-Agent` information with metrics.

## [1.2.0] - 2022-02-01

### Added

- Send request and response body size information with metrics.
- Thoroughly document all exported symbols with JSDoc.
- Enable `inlineSources` for source maps.

### Changed

- Change `statusCode` into an optional parameter in `@apilytics/core` `sendApilyticsMetrics`.

## [1.1.0] - 2022-01-16

### Added

- Send query parameters in addition to the path.

## [1.0.2] - 2022-01-16

### Added

- Send Apilytics version info together with metrics.

## [1.0.1] - 2022-01-12

### Fixed

- Improve README documentation.

## [1.0.0] - 2022-01-11

### Added

- Initial version with Express and Next.js support.

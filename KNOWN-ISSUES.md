# Known issues

## Receipt viewing does not work on a phone
GET /purchases/{id}/receipt returns a signed URL whose host is `minio:9000`,
a name that exists only inside Docker. The phone cannot open it.
Upload, replace and delete of receipts work.

Cause: the backend has one storage address (`S3_ENDPOINT`) and uses it for
signing as well. Needs a separate public address for signed links (backend change).

Status: waiting for the backend owner. App code needs no change.
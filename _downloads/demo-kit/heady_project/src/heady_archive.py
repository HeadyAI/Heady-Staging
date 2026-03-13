class HeadyArchive:
    def preserve(self, manifest, context_tags=None):
        manifest["_heady_archive"] = {
            "status": "preserved",
            "context_tags": context_tags or []
        }
        return manifest

package dev.lyvt.melodify.data

data class PlaylistImport(val ids: List<String>,val unmatched: Int)
fun parsePlaylist(text: String,tracks: List<Track>): PlaylistImport {
    val uriIndex=tracks.associateBy { it.uri }
    val byName=tracks.groupBy { it.fileName.lowercase() }
    val ids=mutableListOf<String>();var missing=0
    text.removePrefix("\uFEFF").lineSequence().map { it.trim() }.filter { it.isNotEmpty()&&!it.startsWith('#') }.forEach { line ->
        if(line.startsWith("http://")||line.startsWith("https://")){missing++;return@forEach}
        val exact=uriIndex[line]
        val candidates=byName[line.substringAfterLast('/').substringAfterLast('\\').lowercase()].orEmpty()
        val match=exact?:candidates.singleOrNull()
        if(match!=null)ids+=match.id else missing++
    }
    return PlaylistImport(ids,missing)
}

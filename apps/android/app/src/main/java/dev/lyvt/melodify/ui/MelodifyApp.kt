@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package dev.lyvt.melodify.ui

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.*
import androidx.compose.foundation.gestures.detectDragGesturesAfterLongPress
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.lyvt.melodify.data.*
import dev.lyvt.melodify.playback.AudioEffects
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

private val destinations=listOf("Startseite","Songs","Alben","Künstler","Playlists")
private val navIcons=listOf(Icons.Rounded.Home,Icons.Rounded.MusicNote,Icons.Rounded.Album,Icons.Rounded.Headphones,Icons.Rounded.QueueMusic)
fun time(ms: Long): String { val s=ms.coerceAtLeast(0)/1000;return "${s/60}:${(s%60).toString().padStart(2,'0')}" }
@Composable fun MelodifyApp(vm: MusicViewModel) {
    val tracks by vm.tracks.collectAsStateWithLifecycle();val results by vm.results.collectAsStateWithLifecycle()
    val playlists by vm.playlists.collectAsStateWithLifecycle();val entries by vm.entries.collectAsStateWithLifecycle()
    val sources by vm.sources.collectAsStateWithLifecycle();val settings by vm.settings.collectAsStateWithLifecycle()
    val playback by vm.playback.collectAsStateWithLifecycle();val scan by vm.app.library.status.collectAsStateWithLifecycle()
    val message by vm.message.collectAsStateWithLifecycle();val audioError by vm.app.playbackError.collectAsStateWithLifecycle()
    val lyrics by vm.lyrics.collectAsStateWithLifecycle()
    var lyricsOpen by remember { mutableStateOf(false) };var lyricsTarget by remember { mutableStateOf<String?>(null) }
    val lyricLauncher=rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri->lyricsTarget?.let { id->if(uri!=null)vm.importLyrics(uri,id) } }
    val context=LocalContext.current
    val themeList=remember(settings.customThemes) { palettes(context,settings.customThemes) }
    var page by rememberSaveable { mutableStateOf("Startseite") };var group by rememberSaveable { mutableStateOf<String?>(null) }
    var playlistId by rememberSaveable { mutableStateOf<String?>(null) }
    var expanded by rememberSaveable { mutableStateOf(false) };var queue by remember { mutableStateOf(false) }
    var topMenu by remember { mutableStateOf(false) };var trackMenu by remember { mutableStateOf<Track?>(null) }
    var playlistTarget by remember { mutableStateOf<Track?>(null) }
    var editPlaylist by remember { mutableStateOf<Playlist?>(null) };var createPlaylist by remember { mutableStateOf(false) }
    var deletePlaylist by remember { mutableStateOf<Playlist?>(null) };var playlistName by rememberSaveable { mutableStateOf("") }
    var permission by remember { mutableStateOf(vm.app.library.hasPermission()) }
    var exportTarget by remember { mutableStateOf<Playlist?>(null) };var coverTarget by remember { mutableStateOf<Playlist?>(null) }
    val permissionLauncher=rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted->permission=granted;if(granted)vm.app.library.scan() }
    val folderLauncher=rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { it?.let(vm::addTree) }
    val importLauncher=rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { it?.let(vm::importPlaylist) }
    val exportLauncher=rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("audio/x-mpegurl")) { uri->exportTarget?.let { p->if(uri!=null)vm.exportPlaylist(uri,p) } }
    val imageLauncher=rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri->if(uri!=null)vm.launch { context.contentResolver.takePersistableUriPermission(uri,Intent.FLAG_GRANT_READ_URI_PERMISSION);val target=coverTarget;if(target!=null)vm.savePlaylist(target.copy(coverUri=uri.toString())) else vm.updateSettings(settings.copy(background=uri.toString())) } }
    val snack=remember { SnackbarHostState() }
    LaunchedEffect(message,audioError,scan.error) { (message?:audioError?:scan.error)?.let { snack.showSnackbar(it);vm.message.value=null;vm.app.playbackError.value=null } }
    LaunchedEffect(Unit) { if(permission && tracks.isEmpty())vm.app.library.scan() }
    MelodifyTheme(settings,themeList) {
        val scheme=MaterialTheme.colorScheme
        SideEffect { val window=(context as? Activity)?.window;if(window!=null)WindowCompat.getInsetsController(window,window.decorView).apply { isAppearanceLightStatusBars=scheme.background.luminanceCompat()>.5f;isAppearanceLightNavigationBars=scheme.surface.luminanceCompat()>.5f } }
        BoxWithConstraints(Modifier.fillMaxSize().background(scheme.background)) {
            val tablet=maxWidth>=720.dp
            Row(Modifier.fillMaxSize()) {
                if(tablet)NavigationRail { Spacer(Modifier.height(24.dp));Icon(Icons.Rounded.GraphicEq,"Melodify",tint=scheme.primary);Spacer(Modifier.height(24.dp));destinations.forEachIndexed { i,label->NavigationRailItem(selected=page==label,onClick={page=label;group=null;playlistId=null},icon={Icon(navIcons[i],label)},label={Text(label)}) } }
                Scaffold(modifier=Modifier.weight(1f),containerColor=scheme.background,snackbarHost={SnackbarHost(snack)},topBar={
                    Column {
                        TopAppBar(title={ Column { Text("melodify.",fontWeight=FontWeight.Bold,color=scheme.onBackground);Text(group?:page,style=MaterialTheme.typography.labelMedium,color=scheme.primary) } },actions={
                            IconButton(onClick={ vm.app.library.scan() }){Icon(Icons.Rounded.Refresh,"Bibliothek aktualisieren")}
                            Box { IconButton(onClick={topMenu=true}){Icon(Icons.Rounded.MoreVert,"Weitere Bereiche")};DropdownMenu(topMenu,{topMenu=false}) {
                                listOf("Favoriten","Ordner","Statistiken","Einstellungen").forEach { label->DropdownMenuItem(text={Text(label)},onClick={page=label;group=null;playlistId=null;topMenu=false}) }
                                DropdownMenuItem(text={Text("M3U / M3U8 importieren")},onClick={topMenu=false;importLauncher.launch(arrayOf("audio/*","application/octet-stream","text/plain","application/vnd.apple.mpegurl"))})
                            } }
                        })
                        if(page!="Einstellungen")OutlinedTextField(value=vm.query.collectAsStateWithLifecycle().value,onValueChange={vm.query.value=it;if(it.isNotBlank()){page="Songs";group=null;playlistId=null}},modifier=Modifier.fillMaxWidth().padding(horizontal=16.dp),singleLine=true,label={Text("Musik durchsuchen")},leadingIcon={Icon(Icons.Rounded.Search,null)})
                        if(scan.running) { LinearProgressIndicator(Modifier.fillMaxWidth().padding(top=8.dp));Row(Modifier.fillMaxWidth().padding(horizontal=16.dp),verticalAlignment=Alignment.CenterVertically) { Text("${scan.current} Titel · ${scan.message}",Modifier.weight(1f),maxLines=1,overflow=TextOverflow.Ellipsis);TextButton(onClick=vm.app.library::cancel){Text("Abbrechen")} } }
                    }
                },bottomBar={ Column {
                    if(playback.current!=null) {
                        Surface(color=scheme.surfaceVariant,onClick={expanded=true}) { Column {
                            Row(Modifier.fillMaxWidth().padding(horizontal=12.dp,vertical=8.dp),verticalAlignment=Alignment.CenterVertically) {
                                Cover(tracks.firstOrNull { it.id==playback.current?.mediaId });Column(Modifier.weight(1f).padding(horizontal=12.dp)) { Text(playback.current?.mediaMetadata?.title?.toString().orEmpty(),maxLines=1,overflow=TextOverflow.Ellipsis,fontWeight=FontWeight.SemiBold);Text(playback.current?.mediaMetadata?.artist?.toString().orEmpty(),maxLines=1,style=MaterialTheme.typography.bodySmall) }
                                IconButton(onClick=vm::toggle){Icon(if(playback.playing)Icons.Rounded.Pause else Icons.Rounded.PlayArrow,if(playback.playing)"Pause" else "Abspielen")};IconButton(onClick=vm::next){Icon(Icons.Rounded.SkipNext,"Nächster Titel")}
                            };LinearProgressIndicator(progress={if(playback.duration>0)playback.position.toFloat()/playback.duration else 0f},modifier=Modifier.fillMaxWidth())
                        } }
                    }
                    if(!tablet)NavigationBar { destinations.forEachIndexed { i,label->NavigationBarItem(selected=page==label,onClick={page=label;group=null;playlistId=null},icon={Icon(navIcons[i],label)},label={Text(label,maxLines=1)}) } }
                }}) { padding->
                    Box(Modifier.fillMaxSize().padding(padding)) {
                        if(settings.background.isNotEmpty()) { val bitmap by produceState<android.graphics.Bitmap?>(null,settings.background) { value=loadImage(context,settings.background) };bitmap?.let { Image(it.asImageBitmapCompat(),null,Modifier.fillMaxSize().graphicsLayer(alpha=.12f),contentScale=androidx.compose.ui.layout.ContentScale.Crop) } }
                        when(page) {
                            "Einstellungen" -> SettingsScreen(settings,themeList,vm,{coverTarget=null;imageLauncher.launch(arrayOf("image/*"))})
                            "Statistiken" -> LazyColumn(contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(16.dp)) {
                                item { Text("Dein Hörverlauf",style=MaterialTheme.typography.headlineMedium);Text("Gesamte lokal erfasste Hörzeit: ${tracks.sumOf { it.heardMs }/60000} Minuten");Text("${tracks.sumOf { it.playCount }} gezählte Wiedergaben. Eine Wiedergabe zählt nach 30 Sekunden oder der Hälfte eines kurzen Titels.") }
                                items(tracks.filter { it.lastPlayed>0 }.sortedByDescending { it.playCount }.take(100),key={it.id}) { t->ListItem(headlineContent={Text(t.title)},supportingContent={Text("${t.playCount} Wiedergaben · ${t.heardMs/1000} Sekunden gehört")},leadingContent={Cover(t)},modifier=Modifier.clickable { vm.play(listOf(t)) }) }
                            }
                            "Ordner" -> LazyColumn(contentPadding=PaddingValues(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
                                item { Text("Deine Musikquellen",style=MaterialTheme.typography.headlineSmall) }
                                item { Text(if(permission)"Medienspeicher ist freigegeben. Interner Speicher und eingebundene SD-Karten werden erfasst." else "Ohne Musikberechtigung bleibt der Medienspeicher gesperrt. Freigegebene Ordner funktionieren weiterhin.") }
                                item { Button(onClick={permissionLauncher.launch(if(Build.VERSION.SDK_INT>=33)Manifest.permission.READ_MEDIA_AUDIO else Manifest.permission.READ_EXTERNAL_STORAGE)}){Text("Musikzugriff erlauben")};OutlinedButton(onClick={folderLauncher.launch(null)}){Text("Musikordner hinzufügen")} }
                                items(sources,key={it.uri}) { source->Card { Column(Modifier.padding(16.dp)) { Text(source.name,fontWeight=FontWeight.Bold);Text(source.error?:if(source.scannedAt>0)"Gescannt" else "Noch nicht gescannt");Text(source.uri,style=MaterialTheme.typography.bodySmall,maxLines=2);TextButton(onClick={vm.launch { vm.app.library.removeSource(source) }}){Text("Quelle entfernen · Dateien behalten")} } } }
                                item { Text("Exakte Inhalts-URIs werden nur einmal gespeichert. Ähnliche Metadaten sind ein Duplikat-Hinweis, kein Beweis identischer Dateien.",style=MaterialTheme.typography.bodySmall) }
                            }
                            "Startseite" -> LazyColumn(contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
                                item { Text("Deine Musik.\nDein Moment.",style=MaterialTheme.typography.headlineLarge,fontWeight=FontWeight.Bold);Spacer(Modifier.height(8.dp));Text("Lokal. Ohne Konto. Ganz bei dir.",color=scheme.primary) }
                                if(tracks.isEmpty())item { EmptyLibrary(permission,{permissionLauncher.launch(if(Build.VERSION.SDK_INT>=33)Manifest.permission.READ_MEDIA_AUDIO else Manifest.permission.READ_EXTERNAL_STORAGE)},{folderLauncher.launch(null)}) }
                                item { TextButton(onClick={page="Songs"}){Text("Alle ${tracks.size} Titel entdecken →")} }
                                homeSection("Zuletzt gehört",tracks.filter { it.lastPlayed>0 }.sortedByDescending { it.lastPlayed }.take(8),vm)
                                homeSection("Frisch in deiner Sammlung",tracks.sortedByDescending { it.addedAt }.take(8),vm)
                                homeSection("Lieblingssongs",tracks.filter { it.favorite }.take(8),vm)
                                item { Text("Favorisierte Playlists",style=MaterialTheme.typography.titleLarge) }
                                items(playlists.filter { it.favorite },key={it.id}) { p->ListItem(headlineContent={Text(p.name)},leadingContent={Cover(null,uri=p.coverUri)},modifier=Modifier.clickable { page="Playlists";playlistId=p.id;group=p.name }) }
                                item { Text("Häufig gehörte Künstler",style=MaterialTheme.typography.titleLarge) }
                                items(tracks.filter { it.playCount>0 }.groupBy { it.artist }.entries.sortedByDescending { it.value.sumOf(Track::playCount) }.take(5),key={it.key}) { entry->ListItem(headlineContent={Text(entry.key)},supportingContent={Text("${entry.value.sumOf(Track::playCount)} Wiedergaben")},modifier=Modifier.clickable { page="Künstler";group=entry.key }) }
                            }
                            "Playlists" -> {
                                val p=playlists.firstOrNull { it.id==playlistId }
                                if(p==null)LazyColumn(contentPadding=PaddingValues(16.dp)) {
                                    item { Button(onClick={playlistName="";editPlaylist=null;createPlaylist=true}){Icon(Icons.Rounded.Add,null);Text("Playlist erstellen")} }
                                    items(listOf("Zuletzt hinzugefügt","Meistgehört","Zuletzt abgespielt","Noch nie gehört")) { name->ListItem(headlineContent={Text(name)},supportingContent={Text("Intelligente lokale Sammlung")},leadingContent={Icon(Icons.Rounded.AutoAwesome,null)},modifier=Modifier.clickable { group=name;page="Sammlung" }) }
                                    items(playlists,key={it.id}) { item->ListItem(headlineContent={Text(item.name)},leadingContent={Cover(null,uri=item.coverUri)},supportingContent={Text("${entries.count { it.playlistId==item.id }} Titel")},trailingContent={IconButton(onClick={vm.savePlaylist(item.copy(favorite=!item.favorite))}){Icon(if(item.favorite)Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder,"Playlist favorisieren")}},modifier=Modifier.clickable { playlistId=item.id;group=item.name }) }
                                } else {
                                    val ids=entries.filter { it.playlistId==p.id }.sortedBy { it.position };val byId=tracks.associateBy { it.id };val list=ids.mapNotNull { byId[it.trackId] }
                                    Column {
                                        Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal=12.dp)) {
                                            TextButton(onClick={playlistId=null;group=null}){Text("Zurück")};TextButton(onClick={editPlaylist=p;playlistName=p.name;createPlaylist=true}){Text("Umbenennen")};TextButton(onClick={vm.duplicate(p)}){Text("Duplizieren")};TextButton(onClick={coverTarget=p;imageLauncher.launch(arrayOf("image/*"))}){Text("Cover")};TextButton(onClick={exportTarget=p;exportLauncher.launch(p.name+".m3u8")}){Text("Export")};TextButton(onClick={deletePlaylist=p}){Text("Löschen")}
                                        }
                                        SongList(list,vm,onMenu={trackMenu=it},playlist=p,onMove={from,to->vm.moveEntry(p,from,to)},onRemove={vm.removeEntry(p,it)})
                                    }
                                }
                            }
                            "Alben","Künstler" -> if(group==null) {
                                val groups=tracks.groupBy { if(page=="Alben")it.album else it.artist }.toSortedMap()
                                LazyColumn(contentPadding=PaddingValues(16.dp)) { items(groups.entries.toList(),key={it.key}) { entry->ListItem(headlineContent={Text(entry.key)},supportingContent={Text("${entry.value.size} Titel")},leadingContent={Cover(entry.value.first())},modifier=Modifier.clickable { group=entry.key }) } }
                            } else SongList(tracks.filter { (if(page=="Alben")it.album else it.artist)==group },vm,onMenu={trackMenu=it},onBack={group=null})
                            else -> {
                                val list=when(page) { "Favoriten"->results.filter { it.favorite };"Sammlung"->when(group) { "Meistgehört"->tracks.filter { it.playCount>0 }.sortedByDescending { it.playCount };"Zuletzt abgespielt"->tracks.filter { it.lastPlayed>0 }.sortedByDescending { it.lastPlayed };"Noch nie gehört"->tracks.filter { it.playCount==0 };else->tracks.sortedByDescending { it.addedAt }.take(100) };else->results }
                                Column { Row(Modifier.fillMaxWidth().padding(horizontal=16.dp),verticalAlignment=Alignment.CenterVertically) { Text("${list.size} Titel",Modifier.weight(1f));var sortMenu by remember { mutableStateOf(false) };Box { TextButton(onClick={sortMenu=true}){Text(vm.sort.collectAsStateWithLifecycle().value)};DropdownMenu(sortMenu,{sortMenu=false}) { listOf("Titel","Künstler","Album","Dauer","Neueste").forEach { value->DropdownMenuItem(text={Text(value)},onClick={vm.sort.value=value;sortMenu=false}) } } };IconButton(onClick={vm.play(list)}){Icon(Icons.Rounded.PlayArrow,"Liste abspielen")} }
                                    if(list.isEmpty())EmptyLibrary(permission,{page="Ordner"},{folderLauncher.launch(null)}) else SongList(list,vm,onMenu={trackMenu=it})
                                }
                            }
                        }
                    }
                }
            }
        }
        if(expanded)ModalBottomSheet(onDismissRequest={expanded=false}) {
            val current=tracks.firstOrNull { it.id==playback.current?.mediaId }
            Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(24.dp),horizontalAlignment=Alignment.CenterHorizontally) {
                Text("AKTUELLE WIEDERGABE",style=MaterialTheme.typography.labelMedium,color=scheme.primary)
                Spacer(Modifier.height(24.dp));Cover(current,Modifier.sizeIn(maxWidth=380.dp,maxHeight=380.dp).fillMaxWidth().aspectRatio(1f));Spacer(Modifier.height(24.dp))
                Text(current?.title.orEmpty(),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Bold);Text(current?.artist.orEmpty(),style=MaterialTheme.typography.titleMedium)
                Slider(value=playback.position.toFloat().coerceAtMost(playback.duration.toFloat()),onValueChange={vm.seek(it.toLong())},valueRange=0f..playback.duration.toFloat().coerceAtLeast(1f),modifier=Modifier.fillMaxWidth())
                Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween) { Text(time(playback.position));Text(time(playback.duration)) }
                Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.Center) {
                    IconButton(onClick=vm::shuffle){Icon(Icons.Rounded.Shuffle,"Zufallswiedergabe",tint=if(playback.shuffle)scheme.primary else scheme.onSurface)}
                    IconButton(onClick=vm::previous){Icon(Icons.Rounded.SkipPrevious,"Vorheriger Titel")}
                    FilledIconButton(onClick=vm::toggle,modifier=Modifier.size(64.dp)){Icon(if(playback.playing)Icons.Rounded.Pause else Icons.Rounded.PlayArrow,if(playback.playing)"Pause" else "Abspielen",Modifier.size(36.dp))}
                    IconButton(onClick=vm::next){Icon(Icons.Rounded.SkipNext,"Nächster Titel")};IconButton(onClick=vm::repeat){Icon(if(playback.repeat==1)Icons.Rounded.RepeatOne else Icons.Rounded.Repeat,"Wiederholung: ${playback.repeat}",tint=if(playback.repeat>0)scheme.primary else scheme.onSurface)}
                }
                Row { IconButton(onClick={current?.let(vm::favorite)},enabled=current!=null){Icon(if(current?.favorite==true)Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder,"Favorit")};TextButton(onClick={queue=true}){Text("Warteschlange")};TextButton(onClick={expanded=false;page="Einstellungen"}){Text("Klang & Design")} }
                Row { TextButton(onClick={lyricsOpen=true}){Text("Songtext")};TextButton(enabled=current!=null,onClick={lyricsTarget=current?.id;lyricLauncher.launch(arrayOf("text/*","application/octet-stream"))}){Text("LRC / Text importieren")} }
                Text("Lautstärke über die Tasten deines Geräts",style=MaterialTheme.typography.bodySmall)
            }
        }
        if(lyricsOpen)ModalBottomSheet(onDismissRequest={lyricsOpen=false}) {
            var follow by remember { mutableStateOf(true) };val state=rememberLazyListState();val active=lyrics.indexOfLast { it.timeMs!=null&&it.timeMs<=playback.position }
            LaunchedEffect(active,follow) { if(follow&&active>=0)state.animateScrollToItem(active) }
            Column(Modifier.fillMaxWidth().heightIn(max=560.dp).padding(16.dp)) {
                Text("Songtext",style=MaterialTheme.typography.titleLarge);Row(verticalAlignment=Alignment.CenterVertically) { Text("Automatisch folgen",Modifier.weight(1f));Switch(follow,{follow=it}) }
                if(lyrics.isEmpty())Text("Kein lokaler Songtext vorhanden. Importiere eine LRC- oder Textdatei im Player.")
                LazyColumn(state=state) { itemsIndexed(lyrics) { i,line->Text(line.text,Modifier.fillMaxWidth().padding(vertical=12.dp),color=if(i==active)scheme.primary else scheme.onSurface,fontWeight=if(i==active)FontWeight.Bold else FontWeight.Normal) } }
            }
        }
        if(queue)ModalBottomSheet(onDismissRequest={queue=false}) {
            Column(Modifier.fillMaxWidth().heightIn(max=600.dp)) { Row(Modifier.fillMaxWidth().padding(16.dp),verticalAlignment=Alignment.CenterVertically) { Text("Warteschlange",style=MaterialTheme.typography.titleLarge,modifier=Modifier.weight(1f));TextButton(onClick=vm::clearQueue){Text("Leeren")} }
                LazyColumn { itemsIndexed(playback.queue,key={i,item->"$i:${item.mediaId}"}) { i,item->
                    var offset by remember { mutableFloatStateOf(0f) };val height=with(LocalDensity.current){64.dp.toPx()}
                    ListItem(modifier=Modifier.graphicsLayer(translationY=offset).pointerInput(i,playback.queue.size) { detectDragGesturesAfterLongPress(onDrag={change,amount->change.consume();offset+=amount.y},onDragEnd={vm.moveQueue(i,(i+(offset/height).toInt()).coerceIn(0,playback.queue.lastIndex));offset=0f},onDragCancel={offset=0f}) }.clickable { vm.queuePlay(i) },headlineContent={Text(item.mediaMetadata.title.toString(),maxLines=1)},supportingContent={Text(item.mediaMetadata.artist.toString(),maxLines=1)},leadingContent={Icon(Icons.Rounded.DragHandle,"Lange drücken und ziehen")},trailingContent={Row { IconButton(onClick={vm.moveQueue(i,i-1)},enabled=i>0){Icon(Icons.Rounded.KeyboardArrowUp,"Nach oben")};IconButton(onClick={vm.removeQueue(i)}){Icon(Icons.Rounded.Close,"Entfernen")} }})
                } }
            }
        }
        trackMenu?.let { t->AlertDialog(onDismissRequest={trackMenu=null},title={Text(t.title)},text={Column { TextButton(onClick={vm.enqueue(t,true);trackMenu=null}){Text("Als Nächstes")};TextButton(onClick={vm.enqueue(t);trackMenu=null}){Text("Später abspielen")};TextButton(onClick={playlistTarget=t;trackMenu=null}){Text("Zu Playlist hinzufügen")};TextButton(onClick={vm.favorite(t);trackMenu=null}){Text(if(t.favorite)"Favorit entfernen" else "Favorisieren")} }},confirmButton={TextButton(onClick={trackMenu=null}){Text("Schließen")}}) }
        playlistTarget?.let { t->AlertDialog(onDismissRequest={playlistTarget=null},title={Text("Playlist auswählen")},text={LazyColumn { if(playlists.isEmpty())item { Text("Erstelle zuerst eine Playlist im Playlist-Bereich.") };items(playlists,key={it.id}) { p->TextButton(onClick={vm.addToPlaylist(t,p);playlistTarget=null}){Text(p.name)} } }},confirmButton={TextButton(onClick={playlistTarget=null}){Text("Abbrechen")}}) }
        if(createPlaylist)AlertDialog(onDismissRequest={createPlaylist=false},title={Text(if(editPlaylist==null)"Neue Playlist" else "Playlist umbenennen")},text={OutlinedTextField(playlistName,{playlistName=it.take(100)},label={Text("Playlistname")},singleLine=true)},confirmButton={TextButton(enabled=playlistName.isNotBlank(),onClick={val p=editPlaylist;if(p==null)vm.createPlaylist(playlistName) else vm.savePlaylist(p.copy(name=playlistName.trim()));createPlaylist=false}){Text("Speichern")}},dismissButton={TextButton(onClick={createPlaylist=false}){Text("Abbrechen")}})
        deletePlaylist?.let { p->AlertDialog(onDismissRequest={deletePlaylist=null},title={Text("Playlist löschen?")},text={Text("„${p.name}“ entfernen? Musikdateien bleiben erhalten.")},confirmButton={TextButton(onClick={vm.deletePlaylist(p);deletePlaylist=null;playlistId=null;group=null}){Text("Löschen")}},dismissButton={TextButton(onClick={deletePlaylist=null}){Text("Abbrechen")}}) }
    }
}
@Composable private fun EmptyLibrary(permission: Boolean,request: ()->Unit,folder: ()->Unit) { Column(Modifier.fillMaxWidth().padding(24.dp),horizontalAlignment=Alignment.CenterHorizontally) { Icon(Icons.Rounded.LibraryMusic,null,Modifier.size(48.dp),tint=MaterialTheme.colorScheme.primary);Text("Deine Musik wartet auf dich.",style=MaterialTheme.typography.titleLarge);Text("Füge lokale Musik hinzu oder passe deine Suche an. Dateien werden nicht verändert.");if(!permission)TextButton(onClick=request){Text("Musikzugriff erlauben")};OutlinedButton(onClick=folder){Text("Ordner auswählen")} } }
private fun androidx.compose.foundation.lazy.LazyListScope.homeSection(title: String,tracks: List<Track>,vm: MusicViewModel) { if(tracks.isNotEmpty()) { item { Text(title,style=MaterialTheme.typography.titleLarge) };items(tracks,key={"$title:${it.id}"}) { t->SongRow(t,{vm.play(tracks,tracks.indexOf(t))},{vm.favorite(t)},null) } } }
@Composable private fun SongList(tracks: List<Track>,vm: MusicViewModel,onMenu: (Track)->Unit,playlist: Playlist?=null,onMove: ((Int,Int)->Unit)?=null,onRemove: ((Int)->Unit)?=null,onBack: (()->Unit)?=null) { LazyColumn(contentPadding=PaddingValues(bottom=16.dp)) { if(onBack!=null)item { TextButton(onClick=onBack){Text("Zur Übersicht")} };itemsIndexed(tracks,key={i,t->"${t.id}:$i"}) { i,t->Column {
    SongRow(t,{vm.play(tracks,i)},{vm.favorite(t)},{onMenu(t)})
    if(playlist!=null)Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.End) { TextButton(onClick={onMove?.invoke(i,i-1)},enabled=i>0){Text("↑")};TextButton(onClick={onMove?.invoke(i,i+1)},enabled=i<tracks.lastIndex){Text("↓")};TextButton(onClick={onRemove?.invoke(i)}){Text("Entfernen")} }
} } } }
@Composable private fun SongRow(t: Track,play: ()->Unit,favorite: ()->Unit,menu: (()->Unit)?) { ListItem(modifier=Modifier.clickable(onClick=play),headlineContent={Text(t.title,maxLines=1,overflow=TextOverflow.Ellipsis)},supportingContent={Text(if(t.missing)"Datei fehlt · Metadaten erhalten" else "${t.artist} · ${time(t.duration)}",maxLines=1,overflow=TextOverflow.Ellipsis)},leadingContent={Cover(t)},trailingContent={Row { IconButton(onClick=favorite){Icon(if(t.favorite)Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder,if(t.favorite)"Favorit entfernen" else "Favorisieren")};if(menu!=null)IconButton(onClick=menu){Icon(Icons.Rounded.MoreVert,"Titeloptionen")} }}) }
private fun Color.luminanceCompat()=this.luminance()
private fun android.graphics.Bitmap.asImageBitmapCompat()=this.asImageBitmap()

import asyncio
import os
import logging
import aiohttp
from dotenv import load_dotenv
from livekit.agents import JobContext, WorkerOptions, cli, AutoSubscribe, stt as stt_module
from livekit import rtc
from livekit.plugins import openai, deepgram, cartesia, silero

load_dotenv()

BACKEND_API = os.getenv("BACKEND_API", "http://localhost:3000/api")
BUSINESS_NAME = os.getenv("BUSINESS_NAME", "Luxury Salon & Spa")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voice-agent")


async def fetch_knowledge():
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BACKEND_API}/knowledge") as resp:
                if resp.status == 200:
                    knowledge = await resp.json()
                    logger.info(f"Loaded {len(knowledge)} knowledge entries")
                    return knowledge
    except Exception as e:
        logger.error(f"Error fetching knowledge: {e}")
    return []


async def process_message(message: str, caller_info: dict):
    try:
        async with aiohttp.ClientSession() as session:
            payload = {
                "message": message,
                "sessionId": caller_info.get("session_id"),
                "callerInfo": caller_info
            }
            async with session.post(f"{BACKEND_API}/process-message", json=payload) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    logger.info(f"Backend response: {result.get('answer', '')[:100]}...")
                    if result.get('needsHelp'):
                        logger.info(f"Help request created: {result.get('requestId', '')[:8]}")
                    return result
    except Exception as e:
        logger.error(f"Error processing message: {e}")
    return {"answer": "I apologize, but I'm having trouble processing that right now."}


async def entrypoint(ctx: JobContext):
    logger.info(f" Voice agent starting - Room: {ctx.room.name}")

    knowledge = await fetch_knowledge()
    knowledge_text = "\n".join([
        f"- {k.get('question', '')}: {k.get('answer', '')}" for k in knowledge
    ])

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info(" Connected to room")
    logger.info(" Waiting for participant to join...")

    participant = await ctx.wait_for_participant()

    caller_info = {
        "name": participant.identity or "Unknown Caller",
        "phone": participant.metadata or "unknown",
        "session_id": ctx.room.name
    }

    logger.info(f" Caller joined: {caller_info['name']} ({caller_info['phone']})")

    # --- TTS Setup ---
    logger.info("Setting up Text-to-Speech...")
    tts = cartesia.TTS() if CARTESIA_API_KEY else openai.TTS()
    logger.info(f"Using {'Cartesia' if CARTESIA_API_KEY else 'OpenAI'} TTS")

    # --- STT Setup ---
    logger.info("Setting up Speech-to-Text...")
    stt = deepgram.STT() if DEEPGRAM_API_KEY else openai.STT()
    logger.info(f"Using {'Deepgram' if DEEPGRAM_API_KEY else 'OpenAI Whisper'} STT")

    # --- Audio Output Track ---
    audio_source = rtc.AudioSource(24000, 1)
    track = rtc.LocalAudioTrack.create_audio_track("agent-voice", audio_source)
    options = rtc.TrackPublishOptions()
    options.source = rtc.TrackSource.SOURCE_MICROPHONE
    await ctx.room.local_participant.publish_track(track, options)
    logger.info("Audio output track published")

    # --- Speak Function ---
    async def speak(text: str):
        logger.info(f"Speaking: {text[:50]}...")
        try:
            async for audio_chunk in tts.synthesize(text):
                await audio_source.capture_frame(audio_chunk.frame)
        except Exception as e:
            logger.error(f"TTS error: {e}")

    # --- Supervisor Message Handler ---
    # Receives messages from the supervisor dashboard and speaks them to the caller
    async def on_supervisor_message(stream, participant_identity: str):
        try:
            message = ""
            async for chunk in stream:
                message += chunk

            if message.strip():
                logger.info(f"Supervisor override from '{participant_identity}': {message[:100]}")
                await speak(message)
                logger.info("Supervisor message spoken to caller")
        except Exception as e:
            logger.error(f"Error handling supervisor message: {e}")

    ctx.room.register_text_stream_handler("lk.agent.request", on_supervisor_message)
    logger.info("Supervisor channel registered — dashboard messages will now be spoken")

    # --- Greeting ---
    greeting = f"Hello! Thank you for calling {BUSINESS_NAME}. How can I help you today?"
    await speak(greeting)
    logger.info("Greeting spoken!")

    conversation_active = True
    is_speaking = False

    # --- Speech Listener ---
    async def listen_for_speech():
        nonlocal is_speaking
        logger.info("🎧 Listening for caller's voice...")
        audio_track = None
        max_retries = 10
        retry_count = 0

        while not audio_track and retry_count < max_retries:
            for pub in participant.track_publications.values():
                if pub.track and pub.track.kind == rtc.TrackKind.KIND_AUDIO:
                    audio_track = pub.track
                    break
            if not audio_track:
                logger.warning(f"No audio track found, retrying... ({retry_count + 1}/{max_retries})")
                await asyncio.sleep(0.5)
                retry_count += 1

        if not audio_track:
            logger.error("Failed to get audio track after retries")
            return

        logger.info("Audio track found, starting STT stream...")
        audio_stream = rtc.AudioStream(audio_track)

        try:
            stt_stream = stt.stream()

            async def push_audio_frames():
                try:
                    async for event in audio_stream:
                        if not conversation_active:
                            break
                        stt_stream.push_frame(event.frame)
                except Exception as e:
                    logger.error(f"Frame pushing error: {e}")
                    import traceback
                    logger.error(traceback.format_exc())

            async def process_stt_events():
                nonlocal is_speaking
                try:
                    async for stt_event in stt_stream:
                        if not conversation_active:
                            break

                        if stt_event.type == stt_module.SpeechEventType.INTERIM_TRANSCRIPT:
                            text = stt_event.alternatives[0].text
                            if text.strip():
                                logger.info(f"Hearing: {text[:50]}...")

                        elif stt_event.type == stt_module.SpeechEventType.FINAL_TRANSCRIPT:
                            text = stt_event.alternatives[0].text
                            if text.strip() and not is_speaking:
                                logger.info(f" User said: {text}")
                                is_speaking = True
                                result = await process_message(text, caller_info)
                                response = result.get("answer", "I'm not sure how to help with that.")
                                await speak(response)
                                is_speaking = False

                except Exception as e:
                    logger.error(f"STT event processing error: {e}")
                    import traceback
                    logger.error(traceback.format_exc())

            logger.info("Starting audio processing and STT event handling...")
            await asyncio.gather(push_audio_frames(), process_stt_events(), return_exceptions=True)

        except Exception as e:
            logger.error(f"STT streaming error: {e}")
            import traceback
            logger.error(traceback.format_exc())

    # --- Disconnect Handler ---
    @ctx.room.on("participant_disconnected")
    def on_disconnect(p):
        nonlocal conversation_active
        if p.sid == participant.sid:
            logger.info("Participant disconnected")
            conversation_active = False

    logger.info("Voice agent fully active!")
    logger.info("Speak now - the agent is listening...")

    listen_task = asyncio.create_task(listen_for_speech())

    try:
        while conversation_active and ctx.room.connection_state == rtc.ConnectionState.CONN_CONNECTED:
            await asyncio.sleep(0.5)
    except KeyboardInterrupt:
        logger.info("Interrupted by user")

    conversation_active = False
    try:
        await asyncio.wait_for(listen_task, timeout=2.0)
    except asyncio.TimeoutError:
        listen_task.cancel()

    logger.info("Agent session complete")


def prewarm(ctx: JobContext):
    logger.info("Prewarming voice agent...")
    if not OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY is required!")
        return
    logger.info("Prewarm complete")
    logger.info("=" * 60)
    logger.info("Voice agent is ready!")
    logger.info("Using manual audio pipeline")
    logger.info("Backend integration: Active")
    logger.info("Supervisor channel: Active")
    logger.info("Dashboard: http://localhost:3000")
    logger.info("=" * 60)


if __name__ == "__main__":
    logger.info("Starting LiveKit Voice Agent")
    logger.info(f"Backend API: {BACKEND_API}")
    logger.info(f"Business: {BUSINESS_NAME}")

    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        )
    )

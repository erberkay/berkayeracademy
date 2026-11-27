cmake_minimum_required(VERSION 3.22)
project(KBAlign VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

option(KB_BUILD_PLUGIN "JUCE plugin hedeflerini derle" ON)
option(KB_BUILD_CLAP "CLAP (clap-juce-extensions)" ON)
set(KB_DEPS_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../../kbdeps" CACHE PATH "JUCE ve clap-juce-extensions klasörü")

# ── JUCE'den bağımsız çekirdek (DSP + analiz + motor)
add_library(kbcore STATIC
    src/analysis/Analyzer.cpp
    src/engine/Engine.cpp)
target_include_directories(kbcore PUBLIC src)
if(NOT MSVC)
    target_compile_options(kbcore PRIVATE -Wall -Wextra -O3)
endif()

add_executable(kb_tests tests/test_main.cpp)
target_link_libraries(kb_tests PRIVATE kbcore)
enable_testing()
add_test(NAME kb_tests COMMAND kb_tests ${CMAKE_CURRENT_SOURCE_DIR}/tests/parity)

if(KB_BUILD_PLUGIN)
    add_subdirectory(${KB_DEPS_DIR}/juce ${CMAKE_BINARY_DIR}/juce)
    if(KB_BUILD_CLAP)
        add_subdirectory(${KB_DEPS_DIR}/clap-juce-extensions ${CMAKE_BINARY_DIR}/clap-juce-extensions EXCLUDE_FROM_ALL)
    endif()

    juce_add_plugin(KBAlign
        COMPANY_NAME "Berkay Er"
        COMPANY_CODE Bker
        PLUGIN_MANUFACTURER_CODE Bker
        PLUGIN_CODE KbAl
        PRODUCT_NAME "KB-Align"
        FORMATS VST3 AU Standalone
        IS_SYNTH FALSE
        NEEDS_MIDI_INPUT FALSE
        NEEDS_MIDI_OUTPUT FALSE
        EDITOR_WANTS_KEYBOARD_FOCUS TRUE
        COPY_PLUGIN_AFTER_BUILD FALSE
        VST3_CATEGORIES Fx Tools
        AU_MAIN_TYPE kAudioUnitType_Effect)

    target_sources(KBAlign PRIVATE
        src/PluginProcessor.cpp
        src/PluginEditor.cpp
        src/ui/Scope.cpp
        src/ui/Widgets.cpp)
    target_compile_definitions(KBAlign PUBLIC
        JUCE_WEB_BROWSER=0 JUCE_USE_CURL=0 JUCE_VST3_CAN_REPLACE_VST2=0
        JUCE_DISPLAY_SPLASH_SCREEN=0)
    target_link_libraries(KBAlign PRIVATE kbcore
        juce::juce_audio_utils juce::juce_dsp
        PUBLIC juce::juce_recommended_config_flags juce::juce_recommended_lto_flags juce::juce_recommended_warning_flags)

    if(KB_BUILD_CLAP)
        clap_juce_extensions_plugin(TARGET KBAlign
            CLAP_ID "com.berkayer.kb-align"
            CLAP_FEATURES audio-effect utility mixing)
    endif()
endif()

if(KB_BUILD_PLUGIN)
    juce_add_console_app(kb_plugin_test PRODUCT_NAME "kb_plugin_test")
    target_sources(kb_plugin_test PRIVATE tests/plugin_test.cpp)
    target_compile_definitions(kb_plugin_test PRIVATE JUCE_WEB_BROWSER=0 JUCE_USE_CURL=0 JucePlugin_Build_Standalone=0)
    target_link_libraries(kb_plugin_test PRIVATE KBAlign juce::juce_audio_utils juce::juce_recommended_config_flags)
    add_test(NAME kb_plugin_test COMMAND kb_plugin_test ${CMAKE_CURRENT_SOURCE_DIR}/tests/parity)
endif()

if(KB_BUILD_PLUGIN)
    juce_add_console_app(kb_snapshot PRODUCT_NAME "kb_snapshot")
    target_sources(kb_snapshot PRIVATE tests/snapshot.cpp)
    target_compile_definitions(kb_snapshot PRIVATE JUCE_WEB_BROWSER=0 JUCE_USE_CURL=0 JUCE_MODAL_LOOPS_PERMITTED=1)
    target_link_libraries(kb_snapshot PRIVATE KBAlign juce::juce_audio_utils juce::juce_recommended_config_flags)
endif()

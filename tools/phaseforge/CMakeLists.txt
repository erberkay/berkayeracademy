# SPDX-License-Identifier: AGPL-3.0-or-later
cmake_minimum_required(VERSION 3.22)
project(PHASEFORGE VERSION 0.1.0 LANGUAGES C CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

option(PF_BUILD_PLUGIN "Build the JUCE plugin targets" ON)
set(PF_DEPS_DIR "$ENV{HOME}/kbdeps" CACHE PATH "Folder that contains juce/ (JUCE 9.0.6)")

# ── JUCE-free DSP core (unit-tested on its own)
file(GLOB PF_DSP_SOURCES CONFIGURE_DEPENDS Source/DSP/*.cpp)
add_library(pfcore STATIC ${PF_DSP_SOURCES})
target_include_directories(pfcore PUBLIC Source)
if(MSVC)
    target_compile_options(pfcore PRIVATE /utf-8 /O2)
else()
    target_compile_options(pfcore PRIVATE -Wall -Wextra -O3)
endif()

# ── DSP unit tests (standalone executables, no JUCE)
foreach(t phase_tests phasematch_tests dyneq_tests analysis_tests)
    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/Tests/${t}.cpp)
        add_executable(${t} Tests/${t}.cpp)
        target_link_libraries(${t} PRIVATE pfcore)
        if(NOT MSVC)
            target_compile_options(${t} PRIVATE -O2)
        endif()
    endif()
endforeach()

if(PF_BUILD_PLUGIN)
    add_subdirectory(${PF_DEPS_DIR}/juce ${CMAKE_BINARY_DIR}/juce)
    juce_add_plugin(PHASEFORGE
        COMPANY_NAME "BE Akademi"
        BUNDLE_ID com.berkayer.phaseforge
        COMPANY_CODE Bker
        PLUGIN_MANUFACTURER_CODE Bker
        PLUGIN_CODE PhFg
        PRODUCT_NAME "PHASEFORGE"
        FORMATS VST3 AU Standalone
        IS_SYNTH FALSE
        NEEDS_MIDI_INPUT FALSE
        NEEDS_MIDI_OUTPUT FALSE
        EDITOR_WANTS_KEYBOARD_FOCUS TRUE
        COPY_PLUGIN_AFTER_BUILD FALSE
        VST3_CATEGORIES Fx EQ Tools
        AU_MAIN_TYPE kAudioUnitType_Effect)
    juce_add_binary_data(pf_resources NAMESPACE PFRes SOURCES
        Resources/fonts/Inter-Regular.otf Resources/fonts/Inter-SemiBold.otf Resources/fonts/InterDisplay-Bold.otf)
    file(GLOB PF_UI_SOURCES CONFIGURE_DEPENDS Source/UI/*.cpp)
    target_sources(PHASEFORGE PRIVATE
        Source/PluginProcessor.cpp
        Source/PluginEditor.cpp
        Source/Parameters/ParameterLayout.cpp
        ${PF_UI_SOURCES})
    target_compile_definitions(PHASEFORGE PUBLIC
        JUCE_WEB_BROWSER=0 JUCE_USE_CURL=0 JUCE_VST3_CAN_REPLACE_VST2=0 JUCE_DISPLAY_SPLASH_SCREEN=0)
    if(MSVC)
        target_compile_options(PHASEFORGE PRIVATE /utf-8)
    endif()
    target_link_libraries(PHASEFORGE PRIVATE pfcore pf_resources juce::juce_audio_utils juce::juce_dsp
        PUBLIC juce::juce_recommended_config_flags juce::juce_recommended_lto_flags juce::juce_recommended_warning_flags)

    juce_add_console_app(pf_plugin_tests PRODUCT_NAME "pf_plugin_tests")
    target_sources(pf_plugin_tests PRIVATE Tests/plugin_tests.cpp)
    target_compile_definitions(pf_plugin_tests PRIVATE JUCE_WEB_BROWSER=0 JUCE_USE_CURL=0 JucePlugin_Build_Standalone=0)
    target_link_libraries(pf_plugin_tests PRIVATE PHASEFORGE juce::juce_audio_utils juce::juce_recommended_config_flags)

    juce_add_console_app(pf_ui_tests PRODUCT_NAME "pf_ui_tests")
    target_sources(pf_ui_tests PRIVATE Tests/ui_tests.cpp)
    target_compile_definitions(pf_ui_tests PRIVATE JUCE_WEB_BROWSER=0 JUCE_USE_CURL=0 JUCE_MODAL_LOOPS_PERMITTED=1)
    target_link_libraries(pf_ui_tests PRIVATE PHASEFORGE juce::juce_audio_utils juce::juce_recommended_config_flags)

    juce_add_console_app(pf_snapshot PRODUCT_NAME "pf_snapshot")
    target_sources(pf_snapshot PRIVATE Tests/snapshot.cpp)
    target_compile_definitions(pf_snapshot PRIVATE JUCE_WEB_BROWSER=0 JUCE_USE_CURL=0 JUCE_MODAL_LOOPS_PERMITTED=1)
    target_link_libraries(pf_snapshot PRIVATE PHASEFORGE juce::juce_audio_utils juce::juce_recommended_config_flags)
endif()

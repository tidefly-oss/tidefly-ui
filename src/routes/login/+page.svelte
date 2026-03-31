<script lang="ts">
import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";
import TideflyLogo from "$lib/assets/tidefly_logo.svg";
import TideflyMascot from "$lib/assets/tidefly_mascot_icon.svg";
import LoginForm from "$lib/components/login/login-form.svelte";
</script>
<div class="grid min-h-svh lg:grid-cols-2">
    <div class="flex flex-col gap-4 p-6 md:p-10">
        <div class="flex justify-center gap-2 md:justify-start">
            <a href="##" class="flex items-center gap-2 font-medium">
                <img
                        src={TideflyMascot}
                        alt="Tidefly"
                        class="size-10 object-cover rounded-full overflow-hidden"
                />
                Tidefly
            </a>
        </div>
        <div class="flex flex-1 items-center justify-center">
            <div class="w-full max-w-xs">
                <LoginForm />
            </div>
        </div>
    </div>
    <div class="bg-muted relative hidden lg:block px-6">
        <img
                src={TideflyLogo}
                alt="placeholder"
                class="absolute inset-0 h-full w-full object-cover"
        />
    </div>
</div>